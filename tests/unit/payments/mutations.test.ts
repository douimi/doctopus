import { describe, expect, it, beforeEach } from 'vitest';
import { dbAdmin } from '@/db/client';
import { eq } from 'drizzle-orm';
import { consultations, appointments, patients, userProfiles, tenants } from '@/db/schema';
import { finalizeConsultation } from '@/lib/consultations/mutations';
import { recordPayment } from '@/lib/payments/mutations';

describe('finalizeConsultation (extended)', () => {
  let tenantId: string;
  let doctorId: string;
  let patientId: string;
  let appointmentId: string;
  let consultationId: string;

  beforeEach(async () => {
    const [t] = await dbAdmin().insert(tenants).values({ name: 'Test Tenant' }).returning();
    tenantId = t.id;

    const [u] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'doctor',
        fullName: 'Dr. Test',
        email: `t-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    doctorId = u.id;

    const [p] = await dbAdmin()
      .insert(patients)
      .values({ tenantId, lastName: 'Test', firstName: 'P', gender: 'm', dateOfBirth: '1990-01-01' })
      .returning();
    patientId = p.id;

    const [a] = await dbAdmin()
      .insert(appointments)
      .values({
        tenantId,
        patientId,
        status: 'in_consultation',
        kind: 'walkin',
        createdBy: doctorId,
        startedAt: new Date(),
      })
      .returning();
    appointmentId = a.id;

    const [c] = await dbAdmin()
      .insert(consultations)
      .values({ tenantId, appointmentId, patientId, doctorId, priceMad: '300.00' })
      .returning();
    consultationId = c.id;
  });

  it('finalize with price sets payment_status=awaiting and stores price', async () => {
    const outcome = await finalizeConsultation(tenantId, consultationId, {
      isFree: false,
      priceMad: '250.00',
      doctorId,
    });
    expect(outcome).toBe('ok');

    const [row] = await dbAdmin().select().from(consultations).where(eq(consultations.id, consultationId));
    expect(row.isFinalized).toBe(true);
    expect(row.priceMad).toBe('250.00');
    expect(row.isFree).toBe(false);
    expect(row.paymentStatus).toBe('awaiting');
    expect(row.paidAt).toBeNull();
    expect(row.paidBy).toBeNull();

    const [appt] = await dbAdmin().select().from(appointments).where(eq(appointments.id, appointmentId));
    expect(appt.status).toBe('done');
    expect(appt.endedAt).not.toBeNull();
  });

  it('finalize with isFree=true sets payment_status=free and paid_at + paid_by', async () => {
    const outcome = await finalizeConsultation(tenantId, consultationId, {
      isFree: true,
      doctorId,
    });
    expect(outcome).toBe('ok');

    const [row] = await dbAdmin().select().from(consultations).where(eq(consultations.id, consultationId));
    expect(row.priceMad).toBeNull();
    expect(row.isFree).toBe(true);
    expect(row.paymentStatus).toBe('free');
    expect(row.paidAt).not.toBeNull();
    expect(row.paidBy).toBe(doctorId);

    const [appt] = await dbAdmin().select().from(appointments).where(eq(appointments.id, appointmentId));
    expect(appt.status).toBe('done');
    expect(appt.endedAt).not.toBeNull();
  });

  it('returns false when already finalized (idempotent no-op)', async () => {
    await finalizeConsultation(tenantId, consultationId, {
      isFree: false,
      priceMad: '250.00',
      doctorId,
    });
    const outcome = await finalizeConsultation(tenantId, consultationId, {
      isFree: true,
      doctorId,
    });
    expect(outcome).toBe('already_finalized');
  });
});

describe('recordPayment', () => {
  let tenantId: string;
  let doctorId: string;
  let assistantId: string;
  let patientId: string;
  let appointmentId: string;
  let consultationId: string;

  beforeEach(async () => {
    const [t] = await dbAdmin().insert(tenants).values({ name: 'Pay Tenant' }).returning();
    tenantId = t.id;

    const [d] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'doctor',
        fullName: 'Dr. Pay',
        email: `dp-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    doctorId = d.id;

    const [a] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'assistant',
        fullName: 'A. Test',
        email: `ap-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    assistantId = a.id;

    const [p] = await dbAdmin()
      .insert(patients)
      .values({ tenantId, lastName: 'PayTest', firstName: 'P', gender: 'f', dateOfBirth: '1985-06-01' })
      .returning();
    patientId = p.id;

    const [appt] = await dbAdmin()
      .insert(appointments)
      .values({
        tenantId,
        patientId,
        status: 'in_consultation',
        kind: 'walkin',
        createdBy: doctorId,
        startedAt: new Date(),
      })
      .returning();
    appointmentId = appt.id;

    const [c] = await dbAdmin()
      .insert(consultations)
      .values({
        tenantId,
        appointmentId,
        patientId,
        doctorId,
        isFinalized: true,
        finalizedAt: new Date(),
        priceMad: '250.00',
        isFree: false,
        paymentStatus: 'awaiting',
      })
      .returning();
    consultationId = c.id;
  });

  it('marks an awaiting consultation as paid with method and recorder', async () => {
    const outcome = await recordPayment(tenantId, {
      consultationId,
      paymentMethod: 'especes',
      paymentNote: null,
      assistantId,
    });
    expect(outcome).toBe('ok');

    const [row] = await dbAdmin().select().from(consultations).where(eq(consultations.id, consultationId));
    expect(row.paymentStatus).toBe('paid');
    expect(row.paymentMethod).toBe('especes');
    expect(row.paidAt).not.toBeNull();
    expect(row.paidBy).toBe(assistantId);
    expect(row.paymentNote).toBeNull();
  });

  it('persists a note when method is autre', async () => {
    const outcome = await recordPayment(tenantId, {
      consultationId,
      paymentMethod: 'autre',
      paymentNote: 'split: 100 espèces + 150 carte',
      assistantId,
    });
    expect(outcome).toBe('ok');

    const [row] = await dbAdmin().select().from(consultations).where(eq(consultations.id, consultationId));
    expect(row.paymentMethod).toBe('autre');
    expect(row.paymentNote).toBe('split: 100 espèces + 150 carte');
  });

  it('returns not_awaiting on an already-paid consultation', async () => {
    await recordPayment(tenantId, {
      consultationId,
      paymentMethod: 'especes',
      paymentNote: null,
      assistantId,
    });
    const outcome = await recordPayment(tenantId, {
      consultationId,
      paymentMethod: 'carte',
      paymentNote: null,
      assistantId,
    });
    expect(outcome).toBe('not_awaiting');
  });

  it('returns not_awaiting on a free consultation', async () => {
    await dbAdmin()
      .update(consultations)
      .set({
        paymentStatus: 'free',
        isFree: true,
        priceMad: null,
        paidAt: new Date(),
        paidBy: doctorId,
      })
      .where(eq(consultations.id, consultationId));
    const outcome = await recordPayment(tenantId, {
      consultationId,
      paymentMethod: 'especes',
      paymentNote: null,
      assistantId,
    });
    expect(outcome).toBe('not_awaiting');
  });

  it('returns not_found when consultation is in another tenant', async () => {
    const [other] = await dbAdmin().insert(tenants).values({ name: 'Other' }).returning();
    const outcome = await recordPayment(other.id, {
      consultationId,
      paymentMethod: 'especes',
      paymentNote: null,
      assistantId,
    });
    expect(outcome).toBe('not_found');
  });
});
