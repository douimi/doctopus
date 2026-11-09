'use server';

import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import {
  canPostIn,
  deleteOwnMessage,
  getAttachmentInfo,
  getMessagingBootstrap,
  listMessages,
  markConversationRead,
  messagesSince,
  openDirectConversation,
  sendMessage,
  setConversationMuted,
  type Scope,
  type SendResult,
} from '@/lib/messaging/queries';
import {
  attachmentPrefix,
  createUploadTarget,
  signedDownloadUrl,
  uploadedSize,
} from '@/lib/messaging/attachments';
import {
  listMessagesSchema,
  sendMessageSchema,
  sinceSchema,
  uploadRequestSchema,
  uuidSchema,
  type SendMessageInput,
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

function errorCode(err: unknown): string | undefined {
  const e = err as { cause?: { code?: string }; code?: string };
  return e?.cause?.code ?? e?.code;
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

export async function sendMessageAction(input: SendMessageInput): Promise<SendResult> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Message invalide.' };
  }
  const s = await scope();
  const msg = parsed.data;
  try {
    let attachment = msg.attachment;
    if (attachment) {
      // The file must have been uploaded by this flow into this
      // conversation's folder, and be as large as announced.
      if (!attachment.path.startsWith(attachmentPrefix(s.tenantId, msg.conversationId))) {
        return { ok: false, error: 'Pièce jointe invalide.' };
      }
      const size = await uploadedSize(attachment.path);
      if (size === null) return { ok: false, error: 'Le fichier n’a pas été reçu. Réessayez.' };
      if (size > 0) attachment = { ...attachment, bytes: size };
    }
    return await sendMessage(s, { ...msg, attachment });
  } catch (err) {
    // Never rethrow: driver errors embed the SQL params (the message text,
    // i.e. patient data) and would reach Sentry. Log the code only.
    console.error('sendMessageAction failed', { code: errorCode(err) });
    return { ok: false, error: 'Envoi impossible. Réessayez.' };
  }
}

export type UploadTarget = { ok: true; path: string; token: string } | { ok: false; error: string };

/** Signed, single-use upload slot in the conversation's private folder. */
export async function createAttachmentUploadAction(input: {
  conversationId: string;
  mime: string;
  bytes: number;
}): Promise<UploadTarget> {
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Fichier invalide.' };
  }
  const s = await scope();
  if (!(await canPostIn(s, parsed.data.conversationId))) {
    return { ok: false, error: 'Conversation introuvable.' };
  }
  try {
    const target = await createUploadTarget(s.tenantId, parsed.data.conversationId, parsed.data.mime);
    return { ok: true, ...target };
  } catch (err) {
    console.error('createAttachmentUploadAction failed', { code: errorCode(err) });
    return { ok: false, error: 'Envoi du fichier impossible.' };
  }
}

/** Short-lived (5 min) URL for a message's file, after an RLS membership check. */
export async function getAttachmentUrlAction(
  messageId: string,
  opts?: { download?: boolean },
): Promise<string | null> {
  const parsed = uuidSchema.safeParse(messageId);
  if (!parsed.success) return null;
  const info = await getAttachmentInfo(await scope(), parsed.data);
  if (!info) return null;
  return signedDownloadUrl(info.path, opts?.download ? (info.name ?? 'fichier') : undefined);
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
