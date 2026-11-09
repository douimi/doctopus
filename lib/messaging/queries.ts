import 'server-only';
import { sql } from 'drizzle-orm';
import { withTenantTx, withTenantUserTx } from '@/db/with-tenant';
import { todayBoundsUtc } from '@/lib/time';
import { removeAttachment } from './attachments';
import {
  DELETE_WINDOW_MS,
  MESSAGE_PAGE_SIZE,
  type ChatMessage,
  type ConversationSummary,
  type MessageKind,
  type MessagePage,
  type MessagingBootstrap,
  type QuickReply,
  type TeamMember,
} from './types';

/**
 * Server-side data access for cabinet messaging. Every query runs inside
 * withTenantUserTx, so RLS (tenant + participant) is the source of truth:
 * a direct thread the caller isn't part of simply doesn't exist here.
 */

export type Scope = { tenantId: string; userId: string };

type Tx = Parameters<Parameters<typeof withTenantUserTx>[2]>[0];

function iso(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  return new Date(String(v)).toISOString();
}

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  kind: ChatMessage['kind'];
  body: string | null;
  patient_id: string | null;
  patient_name: string | null;
  appointment_id: string | null;
  appointment_status: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_bytes: number | null;
  voice_duration_ms: number | null;
  created_at: Date | string;
  deleted_at: Date | string | null;
};

function toMessage(r: MessageRow): ChatMessage {
  const gone = r.deleted_at !== null && r.deleted_at !== undefined;
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderId: r.sender_id,
    senderName: r.sender_name,
    kind: r.kind,
    body: gone ? null : r.body,
    patientId: gone ? null : r.patient_id,
    patientName: gone ? null : r.patient_name,
    appointmentId: gone ? null : r.appointment_id,
    appointmentStatus: gone ? null : r.appointment_status,
    attachmentName: gone ? null : r.attachment_name,
    attachmentMime: gone ? null : r.attachment_mime,
    attachmentBytes: gone ? null : r.attachment_bytes,
    voiceDurationMs: gone ? null : r.voice_duration_ms,
    createdAt: iso(r.created_at)!,
    deletedAt: iso(r.deleted_at),
  };
}

const MESSAGE_COLUMNS = sql`
  m.id, m.conversation_id, m.sender_id, up.full_name AS sender_name, m.kind,
  m.body, m.patient_id,
  (SELECT p.last_name || ' ' || p.first_name FROM patients p WHERE p.id = m.patient_id) AS patient_name,
  m.appointment_id,
  (SELECT a.status FROM appointments a WHERE a.id = m.appointment_id) AS appointment_status,
  m.attachment_name, m.attachment_mime,
  m.attachment_bytes, m.voice_duration_ms, m.created_at, m.deleted_at
`;

const DEFAULT_QUICK_REPLIES: ReadonlyArray<[label: string, body: string]> = [
  ['Patient suivant', 'Faites entrer le patient suivant, s’il vous plaît.'],
  ['Venez svp', 'Pouvez-vous venir dans mon bureau ?'],
  ['Appelez-moi', 'Appelez-moi dès que possible.'],
  ['Patient arrivé', 'Le patient est arrivé, il est en salle d’attente.'],
  ['Appel pour vous', 'Docteur, un appel pour vous.'],
  ['En retard', 'Le patient suivant est en retard.'],
  ['Pause 10 min', 'Je fais une pause de 10 minutes.'],
  ['Bien reçu', 'Bien reçu, merci.'],
];

async function loadQuickReplies(tx: Tx, tenantId: string): Promise<QuickReply[]> {
  // Seed the defaults exactly once per cabinet (the flag flips in the same
  // statement, so a doctor who deletes them all doesn't get them back).
  const values = sql.join(
    DEFAULT_QUICK_REPLIES.map(([label, body], i) => sql`(${label}, ${body}, ${i}::int)`),
    sql`, `,
  );
  await tx.execute(sql`
    WITH flipped AS (
      UPDATE tenants SET quick_replies_seeded = true
      WHERE id = ${tenantId}::uuid AND NOT quick_replies_seeded
      RETURNING id
    )
    INSERT INTO quick_replies (tenant_id, label, body, sort_order)
    SELECT flipped.id, v.label, v.body, v.ord
    FROM flipped, (VALUES ${values}) AS v(label, body, ord)
  `);
  const rows = await tx.execute<{ id: string; label: string; body: string; sort_order: number }>(sql`
    SELECT id, label, body, sort_order FROM quick_replies ORDER BY sort_order, created_at
  `);
  return rows.map((r) => ({ id: r.id, label: r.label, body: r.body, sortOrder: r.sort_order }));
}

async function canSee(tx: Tx, conversationId: string): Promise<boolean> {
  // RLS hides conversations the caller isn't part of.
  const rows = await tx.execute<{ id: string }>(sql`
    SELECT id FROM conversations WHERE id = ${conversationId}::uuid
  `);
  return rows.length > 0;
}

export async function getMessagingBootstrap(s: Scope): Promise<MessagingBootstrap> {
  return withTenantUserTx(s.tenantId, s.userId, async (tx) => {
    // The cabinet thread exists from the first visit on.
    await tx.execute(sql`
      INSERT INTO conversations (tenant_id, kind) VALUES (${s.tenantId}::uuid, 'cabinet')
      ON CONFLICT (tenant_id) WHERE kind = 'cabinet' DO NOTHING
    `);

    const teamRows = await tx.execute<{
      id: string;
      full_name: string;
      role: 'doctor' | 'assistant';
      is_active: boolean;
    }>(sql`
      SELECT id, full_name, role, is_active FROM user_profiles
      ORDER BY (role = 'doctor') DESC, full_name
    `);
    const team: TeamMember[] = teamRows.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      role: r.role,
      active: r.is_active,
    }));
    const me = team.find((m) => m.id === s.userId);
    if (!me) throw new Error('Current user not found in tenant');

    const convRows = await tx.execute<{
      id: string;
      kind: 'cabinet' | 'direct';
      user_a: string | null;
      user_b: string | null;
      last_message_at: Date | string | null;
      muted: boolean | null;
      unread: number | string;
    }>(sql`
      SELECT c.id, c.kind, c.user_a, c.user_b, c.last_message_at, mine.muted,
             (SELECT count(*) FROM messages u
               WHERE u.conversation_id = c.id
                 AND u.sender_id <> ${s.userId}::uuid
                 AND u.deleted_at IS NULL
                 AND u.created_at > COALESCE(mine.last_read_at, '-infinity'::timestamptz)
             ) AS unread
      FROM conversations c
      LEFT JOIN conversation_members mine
        ON mine.conversation_id = c.id AND mine.user_id = ${s.userId}::uuid
    `);

    // One index probe per conversation (messages_conversation_created_idx).
    const lastRows = await tx.execute<MessageRow>(sql`
      SELECT lm.* FROM conversations c
      CROSS JOIN LATERAL (
        SELECT ${MESSAGE_COLUMNS}
        FROM messages m JOIN user_profiles up ON up.id = m.sender_id
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) lm
    `);
    const lastByConv = new Map(lastRows.map((r) => [r.conversation_id, toMessage(r)]));

    const readRows = await tx.execute<{
      conversation_id: string;
      user_id: string;
      last_read_at: Date | string;
    }>(sql`
      SELECT conversation_id, user_id, last_read_at FROM conversation_members
      WHERE last_read_at IS NOT NULL
    `);
    const reads = new Map<string, Record<string, string>>();
    for (const r of readRows) {
      const m = reads.get(r.conversation_id) ?? {};
      m[r.user_id] = iso(r.last_read_at)!;
      reads.set(r.conversation_id, m);
    }

    const conversations: ConversationSummary[] = convRows.map((r) => ({
      id: r.id,
      kind: r.kind,
      userA: r.user_a,
      userB: r.user_b,
      lastMessageAt: iso(r.last_message_at),
      muted: r.muted ?? false,
      unread: Number(r.unread),
      reads: reads.get(r.id) ?? {},
      lastMessage: lastByConv.get(r.id) ?? null,
    }));

    const quickReplies = await loadQuickReplies(tx, s.tenantId);
    return { me, team, conversations, quickReplies };
  });
}

/** Finds or creates the direct thread between the caller and `peerId`. */
export async function openDirectConversation(
  s: Scope,
  peerId: string,
): Promise<ConversationSummary | null> {
  if (peerId === s.userId) return null;
  return withTenantUserTx(s.tenantId, s.userId, async (tx) => {
    const peer = await tx.execute<{ id: string }>(sql`
      SELECT id FROM user_profiles WHERE id = ${peerId}::uuid AND is_active
    `);
    if (peer.length === 0) return null;
    const [a, b] = [s.userId, peerId].sort();
    await tx.execute(sql`
      INSERT INTO conversations (tenant_id, kind, user_a, user_b)
      VALUES (${s.tenantId}::uuid, 'direct', ${a}::uuid, ${b}::uuid)
      ON CONFLICT (tenant_id, user_a, user_b) WHERE kind = 'direct' DO NOTHING
    `);
    const rows = await tx.execute<{
      id: string;
      last_message_at: Date | string | null;
      muted: boolean | null;
    }>(sql`
      SELECT c.id, c.last_message_at, mine.muted
      FROM conversations c
      LEFT JOIN conversation_members mine
        ON mine.conversation_id = c.id AND mine.user_id = ${s.userId}::uuid
      WHERE c.kind = 'direct' AND c.user_a = ${a}::uuid AND c.user_b = ${b}::uuid
    `);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      kind: 'direct',
      userA: a,
      userB: b,
      lastMessage: null,
      lastMessageAt: iso(row.last_message_at),
      unread: 0,
      muted: row.muted ?? false,
      reads: {},
    };
  });
}

export async function listMessages(
  s: Scope,
  conversationId: string,
  before: string | null,
): Promise<MessagePage> {
  return withTenantUserTx(s.tenantId, s.userId, async (tx) => {
    const rows = await tx.execute<MessageRow>(sql`
      SELECT ${MESSAGE_COLUMNS}
      FROM messages m JOIN user_profiles up ON up.id = m.sender_id
      WHERE m.conversation_id = ${conversationId}::uuid
        ${before ? sql`AND m.created_at < ${before}::timestamptz` : sql``}
      ORDER BY m.created_at DESC
      LIMIT ${MESSAGE_PAGE_SIZE + 1}
    `);
    const hasMore = rows.length > MESSAGE_PAGE_SIZE;
    const page = rows.slice(0, MESSAGE_PAGE_SIZE).map(toMessage).reverse();
    return { messages: page, hasMore };
  });
}

export type SendResult = { ok: true; message: ChatMessage } | { ok: false; error: string };

export type SendInput = {
  id: string;
  conversationId: string;
  kind: MessageKind;
  body: string | null;
  patientId: string | null;
  /** Already uploaded + verified by the caller (path prefix, size, mime). */
  attachment: { path: string; name: string; mime: string; bytes: number } | null;
  voiceDurationMs: number | null;
};

/** Today's most relevant appointment for a patient (active ones first). */
async function todaysAppointmentFor(tx: Tx, patientId: string): Promise<string | null> {
  const { startUtc, endUtc } = todayBoundsUtc();
  const rows = await tx.execute<{ id: string }>(sql`
    SELECT id FROM appointments
    WHERE patient_id = ${patientId}::uuid
      AND status NOT IN ('cancelled', 'no_show')
      AND COALESCE(arrived_at, scheduled_at, created_at) >= ${startUtc.toISOString()}::timestamptz
      AND COALESCE(arrived_at, scheduled_at, created_at) < ${endUtc.toISOString()}::timestamptz
    ORDER BY (status IN ('waiting', 'in_consultation')) DESC, created_at DESC
    LIMIT 1
  `);
  return rows[0]?.id ?? null;
}

export async function sendMessage(s: Scope, input: SendInput): Promise<SendResult> {
  return withTenantUserTx(s.tenantId, s.userId, async (tx) => {
    if (!(await canSee(tx, input.conversationId))) {
      return { ok: false, error: 'Conversation introuvable.' };
    }
    let appointmentId: string | null = null;
    if (input.patientId) {
      // Tenant RLS: a patient from another cabinet simply isn't found.
      const p = await tx.execute<{ id: string }>(sql`
        SELECT id FROM patients WHERE id = ${input.patientId}::uuid
      `);
      if (p.length === 0) return { ok: false, error: 'Patient introuvable.' };
      appointmentId = await todaysAppointmentFor(tx, input.patientId);
    }
    const a = input.attachment;
    // Idempotent on the client id: a retried send returns the stored row.
    await tx.execute(sql`
      INSERT INTO messages (
        id, tenant_id, conversation_id, sender_id, kind, body, patient_id, appointment_id,
        attachment_path, attachment_name, attachment_mime, attachment_bytes, voice_duration_ms
      )
      VALUES (
        ${input.id}::uuid, ${s.tenantId}::uuid, ${input.conversationId}::uuid, ${s.userId}::uuid,
        ${input.kind}, ${input.body}, ${input.patientId}::uuid, ${appointmentId}::uuid,
        ${a?.path ?? null}, ${a?.name ?? null}, ${a?.mime ?? null}, ${a?.bytes ?? null}::int,
        ${input.voiceDurationMs}::int
      )
      ON CONFLICT (id) DO NOTHING
    `);
    const rows = await tx.execute<MessageRow>(sql`
      SELECT ${MESSAGE_COLUMNS}
      FROM messages m JOIN user_profiles up ON up.id = m.sender_id
      WHERE m.id = ${input.id}::uuid AND m.sender_id = ${s.userId}::uuid
        AND m.conversation_id = ${input.conversationId}::uuid
    `);
    if (!rows[0]) return { ok: false, error: 'Envoi impossible.' };
    const message = toMessage(rows[0]);

    // Sending a message means you've read the thread up to it.
    await upsertRead(tx, s, input.conversationId, message.createdAt);
    return { ok: true, message };
  });
}

/** Text-only convenience (tests and simple callers). */
export async function sendTextMessage(
  s: Scope,
  input: { id: string; conversationId: string; body: string },
): Promise<SendResult> {
  return sendMessage(s, {
    ...input,
    kind: 'text',
    patientId: null,
    attachment: null,
    voiceDurationMs: null,
  });
}

/** Storage path of a visible, non-deleted message's attachment. */
export async function getAttachmentInfo(
  s: Scope,
  messageId: string,
): Promise<{ path: string; name: string | null; mime: string | null } | null> {
  return withTenantUserTx(s.tenantId, s.userId, async (tx) => {
    const rows = await tx.execute<{
      attachment_path: string | null;
      attachment_name: string | null;
      attachment_mime: string | null;
    }>(sql`
      SELECT attachment_path, attachment_name, attachment_mime FROM messages
      WHERE id = ${messageId}::uuid AND deleted_at IS NULL
    `);
    const r = rows[0];
    if (!r?.attachment_path) return null;
    return { path: r.attachment_path, name: r.attachment_name, mime: r.attachment_mime };
  });
}

/** Caller can post in this conversation (checked before minting an upload URL). */
export async function canPostIn(s: Scope, conversationId: string): Promise<boolean> {
  return withTenantUserTx(s.tenantId, s.userId, (tx) => canSee(tx, conversationId));
}

export async function listQuickReplies(tenantId: string): Promise<QuickReply[]> {
  return withTenantTx(tenantId, async (tx) => {
    const rows = await tx.execute<{ id: string; label: string; body: string; sort_order: number }>(sql`
      SELECT id, label, body, sort_order FROM quick_replies ORDER BY sort_order, created_at
    `);
    return rows.map((r) => ({ id: r.id, label: r.label, body: r.body, sortOrder: r.sort_order }));
  });
}

/** Replaces the cabinet's quick replies with `items` (in order). */
export async function replaceQuickReplies(
  tenantId: string,
  items: ReadonlyArray<{ label: string; body: string }>,
): Promise<void> {
  await withTenantTx(tenantId, async (tx) => {
    await tx.execute(sql`UPDATE tenants SET quick_replies_seeded = true WHERE id = ${tenantId}::uuid`);
    await tx.execute(sql`DELETE FROM quick_replies`);
    for (const [i, it] of items.entries()) {
      await tx.execute(sql`
        INSERT INTO quick_replies (tenant_id, label, body, sort_order)
        VALUES (${tenantId}::uuid, ${it.label}, ${it.body}, ${i})
      `);
    }
  });
}

async function upsertRead(tx: Tx, s: Scope, conversationId: string, at: string | null) {
  await tx.execute(sql`
    INSERT INTO conversation_members (conversation_id, user_id, tenant_id, last_read_at)
    VALUES (${conversationId}::uuid, ${s.userId}::uuid, ${s.tenantId}::uuid,
            ${at ? sql`${at}::timestamptz` : sql`now()`})
    ON CONFLICT (conversation_id, user_id) DO UPDATE
      SET last_read_at = GREATEST(
        COALESCE(conversation_members.last_read_at, '-infinity'::timestamptz),
        EXCLUDED.last_read_at
      )
  `);
}

export async function markConversationRead(s: Scope, conversationId: string): Promise<void> {
  await withTenantUserTx(s.tenantId, s.userId, async (tx) => {
    if (!(await canSee(tx, conversationId))) return;
    await upsertRead(tx, s, conversationId, null);
  });
}

export async function setConversationMuted(
  s: Scope,
  conversationId: string,
  muted: boolean,
): Promise<boolean> {
  return withTenantUserTx(s.tenantId, s.userId, async (tx) => {
    if (!(await canSee(tx, conversationId))) return false;
    await tx.execute(sql`
      INSERT INTO conversation_members (conversation_id, user_id, tenant_id, muted)
      VALUES (${conversationId}::uuid, ${s.userId}::uuid, ${s.tenantId}::uuid, ${muted})
      ON CONFLICT (conversation_id, user_id) DO UPDATE SET muted = EXCLUDED.muted
    `);
    return true;
  });
}

/** Soft-deletes the caller's own message within the delete window (and its file). */
export async function deleteOwnMessage(s: Scope, messageId: string): Promise<boolean> {
  const removed = await withTenantUserTx(s.tenantId, s.userId, async (tx) => {
    const cutoff = new Date(Date.now() - DELETE_WINDOW_MS).toISOString();
    const rows = await tx.execute<{ id: string; old_path: string | null }>(sql`
      WITH old AS (
        SELECT attachment_path FROM messages WHERE id = ${messageId}::uuid
      )
      UPDATE messages
      SET deleted_at = now(), body = NULL, attachment_path = NULL
      WHERE id = ${messageId}::uuid
        AND sender_id = ${s.userId}::uuid
        AND deleted_at IS NULL
        AND created_at > ${cutoff}::timestamptz
      RETURNING id, (SELECT attachment_path FROM old) AS old_path
    `);
    return rows[0] ?? null;
  });
  if (!removed) return false;
  if (removed.old_path) await removeAttachment(removed.old_path).catch(() => {});
  return true;
}

/**
 * Messages created or deleted after `since` across every conversation the
 * caller can see — used after a socket drop. A 30s overlap absorbs the gap
 * between transaction start (created_at) and commit; the client dedupes by
 * id.
 */
export async function messagesSince(s: Scope, since: string): Promise<ChatMessage[]> {
  return withTenantUserTx(s.tenantId, s.userId, async (tx) => {
    const fromMs = new Date(since).getTime() - 30_000;
    const from = new Date(fromMs).toISOString();
    // Deletion is only allowed within DELETE_WINDOW_MS of creation, so a
    // message deleted after `from` was created after `from - window`: the
    // created_at bound keeps the scan on messages_tenant_created_idx.
    const floor = new Date(fromMs - DELETE_WINDOW_MS).toISOString();
    const rows = await tx.execute<MessageRow>(sql`
      SELECT ${MESSAGE_COLUMNS}
      FROM messages m JOIN user_profiles up ON up.id = m.sender_id
      WHERE m.tenant_id = ${s.tenantId}::uuid
        AND m.created_at > ${floor}::timestamptz
        AND (m.created_at > ${from}::timestamptz OR m.deleted_at > ${from}::timestamptz)
      ORDER BY m.created_at
      LIMIT 500
    `);
    return rows.map(toMessage);
  });
}
