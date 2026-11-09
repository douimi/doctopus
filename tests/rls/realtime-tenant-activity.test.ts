import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { dbAdmin } from '@/db/client';
import { appointments, consultations } from '@/db/schema';
import { seedPatient } from '../fixtures/patients';
import { seedAppointment } from '../fixtures/appointments';
import { seedConsultation } from '../fixtures/consultations';
import { collect, joinStatus, seedAuthedTenant, signIn } from '../fixtures/auth-users';
import { registerDbCleanup } from './setup';

registerDbCleanup();

type Activity = Record<string, unknown> & { table: string; op: string; id: string };

const clients: SupabaseClient[] = [];
afterAll(async () => {
  for (const c of clients) await c.removeAllChannels();
});

describe('Realtime — tenant activity topic (migration 0019)', () => {
  it('members receive pings; other tenants cannot join; autosaves stay silent', async () => {
    const a = await seedAuthedTenant('rt-a');
    const b = await seedAuthedTenant('rt-b');

    const assistantA = await signIn(a.assistant);
    const doctorB = await signIn(b.doctor);
    clients.push(assistantA, doctorB);

    const ch = assistantA.channel(`tenant:${a.tenantId}`, { config: { private: true } });
    const feed = collect<Activity>(ch, 'activity');
    expect(await joinStatus(ch)).toBe('SUBSCRIBED');

    const intruder = doctorB.channel(`tenant:${a.tenantId}`, { config: { private: true } });
    const intruderFeed = collect<Activity>(intruder, 'activity');
    expect(await joinStatus(intruder)).not.toBe('SUBSCRIBED');

    // Appointment lands in the waiting room → ping with status fields only.
    const patient = await seedPatient(a.tenantId);
    const appt = await seedAppointment(a.tenantId, patient.id, a.doctor.id, {
      status: 'waiting',
      kind: 'walkin',
      scheduledAt: null,
    });
    const arrival = await feed.waitFor((p) => p.table === 'appointments' && p.id === appt.id);
    expect(arrival).toMatchObject({ op: 'INSERT', status: 'waiting', patientId: patient.id });

    // Consultation created → ping; content-only autosave → no ping;
    // payment flip → ping.
    await dbAdmin().update(appointments).set({ status: 'in_consultation' }).where(eq(appointments.id, appt.id));
    const consult = await seedConsultation(a.tenantId, appt.id, patient.id, a.doctor.id);
    expect(await feed.waitFor((p) => p.table === 'consultations' && p.op === 'INSERT')).not.toBeNull();

    await dbAdmin()
      .update(consultations)
      .set({ motif: 'Toux', historyNotes: 'secret clinical note' })
      .where(eq(consultations.id, consult.id));
    await dbAdmin()
      .update(consultations)
      .set({ paymentStatus: 'paid', paymentMethod: 'especes', paidAt: new Date(), paidBy: a.assistant.id })
      .where(eq(consultations.id, consult.id));
    const paid = await feed.waitFor((p) => p.table === 'consultations' && p.paymentStatus === 'paid');
    expect(paid).toMatchObject({ oldPaymentStatus: 'awaiting' });

    const consultUpdates = feed.received.filter((p) => p.table === 'consultations' && p.op === 'UPDATE');
    expect(consultUpdates).toHaveLength(1);
    // No clinical text ever travels on the socket.
    expect(JSON.stringify(feed.received)).not.toContain('secret clinical note');
    expect(intruderFeed.received).toHaveLength(0);
  }, 30_000);
});
