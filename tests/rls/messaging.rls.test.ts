import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { userProfiles } from '@/db/schema';
import { withTenantTx, withTenantUserTx } from '@/db/with-tenant';
import {
  deleteOwnMessage,
  getMessagingBootstrap,
  listMessages,
  messagesSince,
  openDirectConversation,
  sendTextMessage,
} from '@/lib/messaging/queries';
import { seedTenant } from '../fixtures/tenants';
import { registerDbCleanup } from './setup';

registerDbCleanup();

async function addAssistant(tenantId: string, label: string) {
  const id = randomUUID();
  await dbAdmin().insert(userProfiles).values({
    id,
    tenantId,
    role: 'assistant',
    fullName: `Asst2 ${label}`,
    email: `asst2-${label}-${id}@test.local`,
  });
  return id;
}

async function send(tenantId: string, userId: string, conversationId: string, body: string) {
  const res = await sendTextMessage({ tenantId, userId }, { id: randomUUID(), conversationId, body });
  if (!res.ok) throw new Error(res.error);
  return res.message;
}

describe('RLS — cabinet messaging', () => {
  it('a direct thread is invisible to the other members of the cabinet', async () => {
    const t = await seedTenant('msg-a');
    const asst2 = await addAssistant(t.tenantId, 'msg-a');
    const doctor = { tenantId: t.tenantId, userId: t.doctorId };
    const other = { tenantId: t.tenantId, userId: asst2 };

    const dm = await openDirectConversation(doctor, t.assistantId);
    expect(dm).not.toBeNull();
    await send(t.tenantId, t.doctorId, dm!.id, 'Mme X a appelé, rappelez-la');

    // The second assistant sees neither the conversation nor its messages.
    const boot = await getMessagingBootstrap(other);
    expect(boot.conversations.map((c) => c.id)).not.toContain(dm!.id);
    expect((await listMessages(other, dm!.id, null)).messages).toHaveLength(0);
    expect(await messagesSince(other, new Date(Date.now() - 60_000).toISOString())).toHaveLength(0);
    const insert = await sendTextMessage(other, {
      id: randomUUID(),
      conversationId: dm!.id,
      body: 'intrusion',
    });
    expect(insert.ok).toBe(false);

    // Raw SQL as that user: still nothing.
    const raw = await withTenantUserTx(t.tenantId, asst2, (tx) =>
      tx.execute(sql`SELECT id FROM messages WHERE conversation_id = ${dm!.id}::uuid`),
    );
    expect(raw).toHaveLength(0);

    // Both participants do see it.
    const asst = { tenantId: t.tenantId, userId: t.assistantId };
    expect((await listMessages(asst, dm!.id, null)).messages.map((m) => m.body)).toEqual([
      'Mme X a appelé, rappelez-la',
    ]);
  });

  it('the cabinet thread is shared within a tenant and invisible across tenants', async () => {
    const a = await seedTenant('msg-b');
    const b = await seedTenant('msg-c');
    const bootA = await getMessagingBootstrap({ tenantId: a.tenantId, userId: a.assistantId });
    const cabinetA = bootA.conversations.find((c) => c.kind === 'cabinet')!;
    await send(a.tenantId, a.assistantId, cabinetA.id, 'Patient suivant prêt');

    const doctorA = await getMessagingBootstrap({ tenantId: a.tenantId, userId: a.doctorId });
    const seen = doctorA.conversations.find((c) => c.id === cabinetA.id)!;
    expect(seen.unread).toBe(1);
    expect(seen.lastMessage?.body).toBe('Patient suivant prêt');

    const bootB = await getMessagingBootstrap({ tenantId: b.tenantId, userId: b.doctorId });
    expect(bootB.conversations.map((c) => c.id)).not.toContain(cabinetA.id);
    expect((await listMessages({ tenantId: b.tenantId, userId: b.doctorId }, cabinetA.id, null)).messages).toHaveLength(0);
    const cross = await sendTextMessage(
      { tenantId: b.tenantId, userId: b.doctorId },
      { id: randomUUID(), conversationId: cabinetA.id, body: 'x' },
    );
    expect(cross.ok).toBe(false);
  });

  it('cannot open a direct thread with someone from another cabinet', async () => {
    const a = await seedTenant('msg-d');
    const b = await seedTenant('msg-e');
    expect(
      await openDirectConversation({ tenantId: a.tenantId, userId: a.doctorId }, b.assistantId),
    ).toBeNull();
  });

  it('without app.user_id (plain withTenantTx) no message or direct thread is readable', async () => {
    const t = await seedTenant('msg-f');
    const dm = await openDirectConversation({ tenantId: t.tenantId, userId: t.doctorId }, t.assistantId);
    await send(t.tenantId, t.doctorId, dm!.id, 'privé');
    // Prime the pooled connection with a previous SET LOCAL so the GUC
    // reverts to '' (not NULL) — the policy must still deny.
    await withTenantUserTx(t.tenantId, t.doctorId, async () => {});
    const rows = await withTenantTx(t.tenantId, (tx) =>
      tx.execute(sql`SELECT id FROM conversations WHERE kind = 'direct'`),
    );
    expect(rows).toHaveLength(0);

    // Deterministic version of the same: GUC explicitly ''.
    const blank = await withTenantTx(t.tenantId, async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL "app.user_id" = ''`));
      return tx.execute(sql`
        SELECT (SELECT count(*) FROM conversations WHERE kind = 'direct') AS convs,
               (SELECT count(*) FROM messages) AS msgs
      `);
    });
    expect(Number(blank[0]!.convs)).toBe(0);
    expect(Number(blank[0]!.msgs)).toBe(0);
  });

  it('only the sender can delete, and only their own message', async () => {
    const t = await seedTenant('msg-g');
    const boot = await getMessagingBootstrap({ tenantId: t.tenantId, userId: t.doctorId });
    const cabinet = boot.conversations.find((c) => c.kind === 'cabinet')!;
    const msg = await send(t.tenantId, t.doctorId, cabinet.id, 'à supprimer');

    expect(await deleteOwnMessage({ tenantId: t.tenantId, userId: t.assistantId }, msg.id)).toBe(false);
    expect(await deleteOwnMessage({ tenantId: t.tenantId, userId: t.doctorId }, msg.id)).toBe(true);
    const page = await listMessages({ tenantId: t.tenantId, userId: t.assistantId }, cabinet.id, null);
    expect(page.messages[0]).toMatchObject({ id: msg.id, body: null });
    expect(page.messages[0]!.deletedAt).not.toBeNull();
  });

  it('a sender cannot impersonate another member', async () => {
    const t = await seedTenant('msg-h');
    const boot = await getMessagingBootstrap({ tenantId: t.tenantId, userId: t.assistantId });
    const cabinet = boot.conversations.find((c) => c.kind === 'cabinet')!;
    await expect(
      withTenantUserTx(t.tenantId, t.assistantId, (tx) =>
        tx.execute(sql`
          INSERT INTO messages (tenant_id, conversation_id, sender_id, body)
          VALUES (${t.tenantId}::uuid, ${cabinet.id}::uuid, ${t.doctorId}::uuid, 'faux')
        `),
      ),
    ).rejects.toThrow();
  });
});
