import { describe, expect, it, beforeEach } from 'vitest';
import { dbAdmin } from '@/db/client';
import { consultations, appointments, patients, userProfiles, tenants } from '@/db/schema';
import { getPaymentsForToday } from '@/lib/payments/queries';

describe('getPaymentsForToday', () => {
  let tenantId: string;
  let doctorId: string;
  let assistantId: string;

  async function seedConsultation(opts: {
    paymentStatus: 'awaiting' | 'paid' | 'free';
    paidAt?: Date | null;
    finalizedAt?: Date;
    isFree?: boolean;
  }) {
    const [p] = await dbAdmin()
      .insert(patients)
      .values({
        tenantId,
        lastName: `L${Math.random().toString(36).slice(2, 5)}`,
        firstName: 'P',
        gender: 'm',
        dateOfBirth: '1990-01-01',
      })
      .returning();
    const [appt] = await dbAdmin()
      .insert(appointments)
      .values({
        tenantId,
        patientId: p.id,
        status: 'done',
        kind: 'walkin',
        createdBy: doctorId,
        startedAt: opts.finalizedAt ?? new Date(),
        endedAt: opts.finalizedAt ?? new Date(),
      })
      .returning();
    const isFree = opts.isFree ?? false;
    const [c] = await dbAdmin()
      .insert(consultations)
      .values({
        tenantId,
        appointmentId: appt.id,
        patientId: p.id,
        doctorId,
        isFinalized: true,
        finalizedAt: opts.finalizedAt ?? new Date(),
        priceMad: isFree ? null : '250.00',
        isFree,
        paymentStatus: opts.paymentStatus,
        paymentMethod:
          opts.paymentStatus === 'paid' ? 'especes' : null,
        paidAt: opts.paidAt ?? (opts.paymentStatus === 'awaiting' ? null : new Date()),
        paidBy:
          opts.paymentStatus === 'awaiting'
            ? null
            : opts.paymentStatus === 'paid'
              ? assistantId
              : doctorId,
      })
      .returning();
    return c;
  }

  beforeEach(async () => {
    const [t] = await dbAdmin().insert(tenants).values({ name: 'Q Tenant' }).returning();
    tenantId = t.id;
    const [d] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'doctor',
        fullName: 'Dr. Q',
        email: `dq-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    doctorId = d.id;
    const [a] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'assistant',
        fullName: 'A. Q',
        email: `aq-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    assistantId = a.id;
  });

  it('returns awaiting rows regardless of finalized_at age', async () => {
    const old = await seedConsultation({
      paymentStatus: 'awaiting',
      finalizedAt: new Date(Date.now() - 5 * 86_400_000),
    });
    const recent = await seedConsultation({ paymentStatus: 'awaiting' });
    const { awaiting } = await getPaymentsForToday(tenantId);
    const ids = awaiting.map((r) => r.consultationId);
    expect(ids).toContain(old.id);
    expect(ids).toContain(recent.id);
  });

  it('orders awaiting rows by finalized_at DESC', async () => {
    const old = await seedConsultation({
      paymentStatus: 'awaiting',
      finalizedAt: new Date(Date.now() - 86_400_000),
    });
    const recent = await seedConsultation({ paymentStatus: 'awaiting' });
    const { awaiting } = await getPaymentsForToday(tenantId);
    const ids = awaiting.map((r) => r.consultationId);
    const oldIdx = ids.indexOf(old.id);
    const recentIdx = ids.indexOf(recent.id);
    expect(recentIdx).toBeLessThan(oldIdx);
  });

  it('returns paid rows whose paid_at is today in collectedToday', async () => {
    const today = await seedConsultation({
      paymentStatus: 'paid',
      paidAt: new Date(),
    });
    const yesterday = await seedConsultation({
      paymentStatus: 'paid',
      paidAt: new Date(Date.now() - 86_400_000),
    });
    const { collectedToday } = await getPaymentsForToday(tenantId);
    const ids = collectedToday.map((r) => r.consultationId);
    expect(ids).toContain(today.id);
    expect(ids).not.toContain(yesterday.id);
  });

  it('includes free consultations whose paid_at is today in collectedToday', async () => {
    const c = await seedConsultation({
      paymentStatus: 'free',
      isFree: true,
      paidAt: new Date(),
    });
    const { collectedToday } = await getPaymentsForToday(tenantId);
    const ids = collectedToday.map((r) => r.consultationId);
    expect(ids).toContain(c.id);
  });

  it('isolates by tenant', async () => {
    const otherSavedTenantId = tenantId;
    const [otherT] = await dbAdmin().insert(tenants).values({ name: 'Other Q' }).returning();
    tenantId = otherT.id;
    const [otherDoc] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'doctor',
        fullName: 'Dr. Other',
        email: `dox-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    doctorId = otherDoc.id;
    const cross = await seedConsultation({ paymentStatus: 'awaiting' });
    tenantId = otherSavedTenantId;
    const { awaiting } = await getPaymentsForToday(tenantId);
    const ids = awaiting.map((r) => r.consultationId);
    expect(ids).not.toContain(cross.id);
  });
});
