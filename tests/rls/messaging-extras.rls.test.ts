import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getAttachmentInfo,
  getMessagingBootstrap,
  listQuickReplies,
  replaceQuickReplies,
  sendMessage,
} from '@/lib/messaging/queries';
import {
  ATTACHMENT_BUCKET,
  createUploadTarget,
  signedDownloadUrl,
  uploadedSize,
} from '@/lib/messaging/attachments';
import { seedTenant } from '../fixtures/tenants';
import { seedPatient } from '../fixtures/patients';
import { seedAppointment } from '../fixtures/appointments';
import { collect, joinStatus, seedAuthedTenant, signIn } from '../fixtures/auth-users';
import { registerDbCleanup } from './setup';

registerDbCleanup();

const clients: SupabaseClient[] = [];
afterAll(async () => {
  for (const c of clients) await c.removeAllChannels();
});

async function cabinetOf(tenantId: string, userId: string) {
  const boot = await getMessagingBootstrap({ tenantId, userId });
  return { boot, cabinet: boot.conversations.find((c) => c.kind === 'cabinet')! };
}

describe('Messaging phases 2–3', () => {
  it('seeds default quick replies once; a doctor can replace them', async () => {
    const t = await seedTenant('qr-a');
    const { boot } = await cabinetOf(t.tenantId, t.assistantId);
    expect(boot.quickReplies.length).toBeGreaterThanOrEqual(5);
    // Second bootstrap doesn't duplicate.
    const again = await getMessagingBootstrap({ tenantId: t.tenantId, userId: t.doctorId });
    expect(again.quickReplies).toHaveLength(boot.quickReplies.length);

    await replaceQuickReplies(t.tenantId, []);
    const empty = await getMessagingBootstrap({ tenantId: t.tenantId, userId: t.doctorId });
    expect(empty.quickReplies).toHaveLength(0); // never re-seeded

    await replaceQuickReplies(t.tenantId, [{ label: 'Go', body: 'Entrez' }]);
    expect((await listQuickReplies(t.tenantId)).map((q) => q.label)).toEqual(['Go']);
    const other = await seedTenant('qr-b');
    await getMessagingBootstrap({ tenantId: other.tenantId, userId: other.doctorId });
    expect((await listQuickReplies(other.tenantId)).map((q) => q.label)).not.toContain('Go');
  });

  it('links a patient (+ today’s appointment); refuses a patient from another cabinet', async () => {
    const t = await seedTenant('pm-a');
    const other = await seedTenant('pm-b');
    const { cabinet } = await cabinetOf(t.tenantId, t.assistantId);
    const patient = await seedPatient(t.tenantId);
    const appt = await seedAppointment(t.tenantId, patient.id, t.assistantId, {
      status: 'waiting',
      kind: 'walkin',
      scheduledAt: null,
      arrivedAt: new Date(),
    });
    const res = await sendMessage(
      { tenantId: t.tenantId, userId: t.assistantId },
      {
        id: randomUUID(),
        conversationId: cabinet.id,
        kind: 'text',
        body: 'Elle demande ses résultats',
        patientId: patient.id,
        attachment: null,
        voiceDurationMs: null,
      },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.message.patientName).toBeTruthy();
    expect(res.message.appointmentId).toBe(appt.id);
    expect(res.message.appointmentStatus).toBe('waiting');

    const foreign = await seedPatient(other.tenantId);
    const bad = await sendMessage(
      { tenantId: t.tenantId, userId: t.assistantId },
      {
        id: randomUUID(),
        conversationId: cabinet.id,
        kind: 'text',
        body: 'x',
        patientId: foreign.id,
        attachment: null,
        voiceDurationMs: null,
      },
    );
    expect(bad.ok).toBe(false);
  });

  it('attachments: signed upload → verified size → signed download, invisible to other cabinets', async () => {
    const t = await seedTenant('att-a');
    const other = await seedTenant('att-b');
    const { cabinet } = await cabinetOf(t.tenantId, t.doctorId);
    const target = await createUploadTarget(t.tenantId, cabinet.id, 'application/pdf');
    expect(target.path.startsWith(`${t.tenantId}/${cabinet.id}/`)).toBe(true);

    // Upload like the browser does: anon client + signed token, no session.
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
    const pdf = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
    const up = await anon.storage.from(ATTACHMENT_BUCKET).uploadToSignedUrl(target.path, target.token, pdf, {
      contentType: 'application/pdf',
    });
    expect(up.error).toBeNull();
    expect(await uploadedSize(target.path)).toBeGreaterThan(0);

    // The bucket is private: anon can't read it directly.
    const direct = await anon.storage.from(ATTACHMENT_BUCKET).download(target.path);
    expect(direct.data).toBeNull();

    const id = randomUUID();
    const res = await sendMessage(
      { tenantId: t.tenantId, userId: t.doctorId },
      {
        id,
        conversationId: cabinet.id,
        kind: 'attachment',
        body: null,
        patientId: null,
        attachment: { path: target.path, name: 'bilan.pdf', mime: 'application/pdf', bytes: pdf.size },
        voiceDurationMs: null,
      },
    );
    expect(res.ok).toBe(true);
    const info = await getAttachmentInfo({ tenantId: t.tenantId, userId: t.assistantId }, id);
    expect(info?.path).toBe(target.path);
    const url = await signedDownloadUrl(info!.path);
    const body = await fetch(url!).then((r) => r.text());
    expect(body).toContain('%PDF');

    expect(await getAttachmentInfo({ tenantId: other.tenantId, userId: other.doctorId }, id)).toBeNull();
  });

  it('typing topic: members exchange typing pings, other cabinets cannot join', async () => {
    const a = await seedAuthedTenant('typing-a');
    const b = await seedAuthedTenant('typing-b');
    const doctor = await signIn(a.doctor);
    const assistant = await signIn(a.assistant);
    const outsider = await signIn(b.doctor);
    clients.push(doctor, assistant, outsider);

    const listen = doctor.channel(`typing:${a.tenantId}`, { config: { private: true } });
    const feed = collect<{ userId: string; conversationId: string | null }>(listen, 'typing');
    expect(await joinStatus(listen)).toBe('SUBSCRIBED');

    const talk = assistant.channel(`typing:${a.tenantId}`, { config: { private: true } });
    expect(await joinStatus(talk)).toBe('SUBSCRIBED');
    await talk.send({ type: 'broadcast', event: 'typing', payload: { userId: a.assistant.id, conversationId: 'c1' } });
    expect(await feed.waitFor((p) => p.userId === a.assistant.id)).not.toBeNull();

    const spy = outsider.channel(`typing:${a.tenantId}`, { config: { private: true } });
    expect(await joinStatus(spy)).not.toBe('SUBSCRIBED');
  }, 40_000);
});
