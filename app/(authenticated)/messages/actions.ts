'use server';

import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import {
  deleteOwnMessage,
  getMessagingBootstrap,
  listMessages,
  markConversationRead,
  messagesSince,
  openDirectConversation,
  sendTextMessage,
  setConversationMuted,
  type Scope,
  type SendResult,
} from '@/lib/messaging/queries';
import {
  listMessagesSchema,
  sendMessageSchema,
  sinceSchema,
  uuidSchema,
} from '@/lib/messaging/schemas';
import type {
  ChatMessage,
  ConversationSummary,
  MessagePage,
  MessagingBootstrap,
} from '@/lib/messaging/types';

/**
 * Cabinet messaging server actions. The tenant AND the user always come
 * from the server session — never from the client — and every query runs
 * under per-user RLS (withTenantUserTx).
 */

async function scope(): Promise<Scope> {
  const session = await requireSession();
  return { tenantId: session.tenantId, userId: session.userId };
}

export async function getMessagingBootstrapAction(): Promise<MessagingBootstrap> {
  return getMessagingBootstrap(await scope());
}

export async function openDirectConversationAction(
  peerId: string,
): Promise<ConversationSummary | null> {
  const parsed = uuidSchema.safeParse(peerId);
  if (!parsed.success) return null;
  return openDirectConversation(await scope(), parsed.data);
}

export async function listMessagesAction(input: {
  conversationId: string;
  before?: string | null;
}): Promise<MessagePage> {
  const parsed = listMessagesSchema.safeParse(input);
  if (!parsed.success) return { messages: [], hasMore: false };
  return listMessages(await scope(), parsed.data.conversationId, parsed.data.before ?? null);
}

export async function sendMessageAction(input: {
  id: string;
  conversationId: string;
  body: string;
}): Promise<SendResult> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Message invalide.' };
  }
  const s = await scope();
  try {
    return await sendTextMessage(s, parsed.data);
  } catch (err) {
    // Never rethrow: driver errors embed the SQL params (the message text,
    // i.e. patient data) and would reach Sentry. Log the code only.
    const code = (err as { cause?: { code?: string }; code?: string }).cause?.code ??
      (err as { code?: string }).code;
    console.error('sendMessageAction failed', { code });
    return { ok: false, error: 'Envoi impossible. Réessayez.' };
  }
}

export async function markConversationReadAction(conversationId: string): Promise<void> {
  const parsed = uuidSchema.safeParse(conversationId);
  if (!parsed.success) return;
  await markConversationRead(await scope(), parsed.data);
}

export async function setConversationMutedAction(
  conversationId: string,
  muted: boolean,
): Promise<boolean> {
  const parsed = z.object({ id: uuidSchema, muted: z.boolean() }).safeParse({
    id: conversationId,
    muted,
  });
  if (!parsed.success) return false;
  return setConversationMuted(await scope(), parsed.data.id, parsed.data.muted);
}

export async function deleteMessageAction(messageId: string): Promise<boolean> {
  const parsed = uuidSchema.safeParse(messageId);
  if (!parsed.success) return false;
  return deleteOwnMessage(await scope(), parsed.data);
}

export async function messagesSinceAction(since: string): Promise<ChatMessage[]> {
  const parsed = sinceSchema.safeParse(since);
  if (!parsed.success) return [];
  return messagesSince(await scope(), parsed.data);
}
