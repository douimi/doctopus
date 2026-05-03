import { streamText } from 'ai';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { dbAdmin } from '@/db/client';
import { withTenantTx } from '@/db/with-tenant';
import { consultationChatMessages, chatbotUsage } from '@/db/schema';
import { requireDoctor } from '@/lib/auth/guards';
import { buildContext, ContextTooLargeError } from '@/lib/chatbot/context';
import {
  NoCreditsError,
  debitOneCredit,
} from '@/lib/chatbot/credits';
import {
  ModelNotAllowedError,
  ProviderNotConfiguredError,
  getModel,
  type Provider,
} from '@/lib/chatbot/provider';
import { computeCostMicrousd } from '@/lib/chatbot/cost';
import {
  MAX_OUTPUT_TOKENS_PER_TURN,
  MAX_TOKENS_PER_CONSULTATION,
  MAX_TURNS_PER_CONSULTATION,
} from '@/lib/chatbot/pricing';
import { SYSTEM_PROMPT } from '@/lib/chatbot/system-prompt';
import { recordAudit } from '@/lib/audit/record';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

function jsonError(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}

export async function POST(req: Request) {
  const session = await requireDoctor();
  const body = (await req.json()) as { consultationId?: string; messages?: Msg[] };
  const { consultationId, messages } = body;
  if (!consultationId || !Array.isArray(messages) || messages.length === 0) {
    return jsonError('bad_request', 400);
  }
  const lastUser = messages.at(-1);
  if (!lastUser || lastUser.role !== 'user') return jsonError('bad_request', 400);

  // Load tenant + consultation; validate.
  const admin = dbAdmin();
  const [tenantRow] = await admin.execute<{
    chatbot_provider: Provider | null;
    chatbot_model: string | null;
    chatbot_enabled: boolean;
  }>(
    sql`SELECT chatbot_provider, chatbot_model, chatbot_enabled FROM tenants WHERE id = ${session.tenantId}::uuid`,
  );
  if (!tenantRow?.chatbot_enabled || !tenantRow.chatbot_provider || !tenantRow.chatbot_model) {
    return jsonError('not_configured', 400);
  }

  const [consultRow] = await admin.execute<{
    is_finalized: boolean;
    tenant_id: string;
  }>(
    sql`SELECT is_finalized, tenant_id FROM consultations WHERE id = ${consultationId}::uuid`,
  );
  if (!consultRow || consultRow.tenant_id !== session.tenantId) {
    return jsonError('consultation_unavailable', 400);
  }
  if (consultRow.is_finalized) return jsonError('consultation_finalized', 400);

  // Turn cap.
  const [turnsRow] = await admin.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM consultation_chat_messages WHERE consultation_id = ${consultationId}::uuid AND role = 'user'`,
  );
  const priorTurns = turnsRow?.count ?? 0;
  if (priorTurns >= MAX_TURNS_PER_CONSULTATION) return jsonError('turn_cap', 429);

  // Cumulative-token cap (input+output across prior usage rows for this consultation).
  const [cumRow] = await admin.execute<{ total: number }>(
    sql`SELECT COALESCE(SUM(input_tokens) + SUM(output_tokens), 0)::int AS total FROM chatbot_usage WHERE consultation_id = ${consultationId}::uuid`,
  );
  const cumulativeTokens = cumRow?.total ?? 0;
  if (cumulativeTokens >= MAX_TOKENS_PER_CONSULTATION) return jsonError('token_cap', 429);

  // Atomic debit on first turn.
  try {
    await debitOneCredit(session.tenantId, consultationId);
  } catch (err) {
    if (err instanceof NoCreditsError) return jsonError('no_credits', 402);
    throw err;
  }

  // Build context.
  let context: string;
  try {
    context = await buildContext(session.tenantId, consultationId);
  } catch (err) {
    if (err instanceof ContextTooLargeError) return jsonError('context_too_large', 400);
    throw err;
  }

  // Get model.
  let model;
  try {
    model = getModel(tenantRow.chatbot_provider, tenantRow.chatbot_model);
  } catch (err) {
    if (err instanceof ProviderNotConfiguredError || err instanceof ModelNotAllowedError) {
      return jsonError('not_configured', 500);
    }
    throw err;
  }

  // Persist the user message immediately so it's visible if the stream fails.
  await withTenantTx(session.tenantId, async (tx) => {
    await tx.insert(consultationChatMessages).values({
      tenantId: session.tenantId,
      consultationId,
      role: 'user',
      content: lastUser.content,
    });
  });

  const provider = tenantRow.chatbot_provider;
  const modelName = tenantRow.chatbot_model;

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: context },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    maxOutputTokens: MAX_OUTPUT_TOKENS_PER_TURN,
    onFinish: async ({ text, usage }) => {
      try {
        const inputTokens = usage?.inputTokens ?? 0;
        const outputTokens = usage?.outputTokens ?? 0;
        const cost = computeCostMicrousd(modelName, inputTokens, outputTokens);

        const [savedAssistant] = await withTenantTx(session.tenantId, async (tx) => {
          return tx
            .insert(consultationChatMessages)
            .values({
              tenantId: session.tenantId,
              consultationId,
              role: 'assistant',
              content: text,
            })
            .returning();
        });

        await admin.insert(chatbotUsage).values({
          tenantId: session.tenantId,
          consultationId,
          messageId: savedAssistant.id,
          provider,
          model: modelName,
          inputTokens,
          outputTokens,
          estimatedCostMicrousd: cost,
        });

        await recordAudit({
          tenantId: session.tenantId,
          actorUserId: session.userId,
          action: 'ai.chat_message_sent',
          entityType: 'consultation',
          entityId: consultationId,
          metadata: {
            provider,
            model: modelName,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            credit_debited: priorTurns === 0,
          },
        });
      } catch (err) {
        console.error('[chat] post-stream persistence failed', err);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
