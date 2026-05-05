import { describe, expect, it, beforeEach } from 'vitest';
import { dbAdmin } from '@/db/client';
import { eq } from 'drizzle-orm';
import { consultations, appointments, patients, userProfiles, tenants } from '@/db/schema';
import { finalizeConsultation } from '@/lib/consultations/mutations';

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
    const ok = await finalizeConsultation(tenantId, consultationId, {
      isFree: false,
      priceMad: '250.00',
      doctorId,
    });
    expect(ok).toBe(true);

    const [row] = await dbAdmin().select().from(consultations).where(eq(consultations.id, consultationId));
    expect(row.isFinalized).toBe(true);
    expect(row.priceMad).toBe('250.00');
    expect(row.isFree).toBe(false);
    expect(row.paymentStatus).toBe('awaiting');
    expect(row.paidAt).toBeNull();
    expect(row.paidBy).toBeNull();
  });

  it('finalize with isFree=true sets payment_status=free and paid_at + paid_by', async () => {
    const ok = await finalizeConsultation(tenantId, consultationId, {
      isFree: true,
      doctorId,
    });
    expect(ok).toBe(true);

    const [row] = await dbAdmin().select().from(consultations).where(eq(consultations.id, consultationId));
    expect(row.priceMad).toBeNull();
    expect(row.isFree).toBe(true);
    expect(row.paymentStatus).toBe('free');
    expect(row.paidAt).not.toBeNull();
    expect(row.paidBy).toBe(doctorId);
  });

  it('returns false when already finalized (idempotent no-op)', async () => {
    await finalizeConsultation(tenantId, consultationId, {
      isFree: false,
      priceMad: '250.00',
      doctorId,
    });
    const ok = await finalizeConsultation(tenantId, consultationId, {
      isFree: true,
      doctorId,
    });
    expect(ok).toBe(false);
  });
});
