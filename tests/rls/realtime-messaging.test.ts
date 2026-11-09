import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  markConversationRead,
  openDirectConversation,
  sendTextMessage,
} from '@/lib/messaging/queries';
import { collect, joinStatus, seedAuthedTenant, seedAuthedUser, signIn } from '../fixtures/auth-users';
import { registerDbCleanup } from './setup';

registerDbCleanup();

type NewPayload = {
  conversation: { id: string; kind: string };
  message: { id: string; body: string | null; senderName: string; conversationId: string };
};

const clients: SupabaseClient[] = [];
afterAll(async () => {
  for (const c of clients) await c.removeAllChannels();
});

describe('Realtime — per-user inbox (migration 0020)', () => {
  it('delivers direct messages only to the two participants', async () => {
    const t = await seedAuthedTenant('inbox');
    const asst2 = await seedAuthedUser(t.tenantId, 'assistant', 'inbox-2');

    const doctorClient = await signIn(t.doctor);
    const asst2Client = await signIn(asst2);
    clients.push(doctorClient, asst2Client);

    const doctorInbox = doctorClient.channel(`user:${t.doctor.id}`, { config: { private: true } });
    const doctorFeed = collect<NewPayload>(doctorInbox, 'message.new');
    const doctorReads = collect<{ userId: string }>(doctorInbox, 'conversation.read');
    expect(await joinStatus(doctorInbox)).toBe('SUBSCRIBED');

    const asst2Inbox = asst2Client.channel(`user:${asst2.id}`, { config: { private: true } });
    const asst2Feed = collect<NewPayload>(asst2Inbox, 'message.new');
    expect(await joinStatus(asst2Inbox)).toBe('SUBSCRIBED');

    // Nobody can listen on someone else's inbox.
    const spy = asst2Client.channel(`user:${t.doctor.id}`, { config: { private: true } });
    expect(await joinStatus(spy)).not.toBe('SUBSCRIBED');

    const asst = { tenantId: t.tenantId, userId: t.assistant.id };
    const dm = await openDirectConversation(asst, t.doctor.id);
    const sent = await sendTextMessage(asst, {
      id: randomUUID(),
      conversationId: dm!.id,
      body: 'Docteur, le patient de 10h est arrivé',
    });
    expect(sent.ok).toBe(true);

    const got = await doctorFeed.waitFor((p) => p.message.conversationId === dm!.id);
    expect(got?.message.body).toBe('Docteur, le patient de 10h est arrivé');
    expect(got?.conversation.kind).toBe('direct');
    expect(got?.message.senderName).toContain('assistant');

    // Read receipt reaches the other participant.
    await markConversationRead({ tenantId: t.tenantId, userId: t.doctor.id }, dm!.id);
    expect(await doctorReads.waitFor((p) => p.userId === t.doctor.id)).not.toBeNull();

    // Give the wire a moment: the outsider must have received nothing.
    await new Promise((r) => setTimeout(r, 800));
    expect(asst2Feed.received).toHaveLength(0);
  }, 40_000);
});
