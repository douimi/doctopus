import { dbAdmin } from '@/db/client';
import {
  consultationChatMessages,
  chatbotCreditLedger,
  chatbotUsage,
} from '@/db/schema';

export async function seedChatMessage(
  tenantId: string,
  consultationId: string,
  role: 'user' | 'assistant' | 'system' = 'user',
  content = 'test message',
) {
  const [row] = await dbAdmin()
    .insert(consultationChatMessages)
    .values({ tenantId, consultationId, role, content })
    .returning();
  return row;
}

export async function seedLedgerGrant(
  tenantId: string,
  change: number,
  grantedBy = 'cli:test',
) {
  const [row] = await dbAdmin()
    .insert(chatbotCreditLedger)
    .values({ tenantId, change, reason: 'grant', grantedBy })
    .returning();
  return row;
}

export async function seedUsage(
  tenantId: string,
  consultationId: string,
  overrides: Partial<typeof chatbotUsage.$inferInsert> = {},
) {
  const [row] = await dbAdmin()
    .insert(chatbotUsage)
    .values({
      tenantId,
      consultationId,
      provider: overrides.provider ?? 'anthropic',
      model: overrides.model ?? 'claude-haiku-4-5-20251001',
      inputTokens: overrides.inputTokens ?? 1000,
      outputTokens: overrides.outputTokens ?? 200,
      estimatedCostMicrousd: overrides.estimatedCostMicrousd ?? 1600,
      ...overrides,
    })
    .returning();
  return row;
}
