import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { seedTenant } from '../fixtures/tenants';
import { seedPatient } from '../fixtures/patients';
import { seedAppointment } from '../fixtures/appointments';
import { seedConsultation } from '../fixtures/consultations';
import { registerDbCleanup } from './setup';

registerDbCleanup();

describe('RLS — consultation pricing', () => {
  it('A cannot SELECT B pricing fields', async () => {
    const a = await seedTenant('rls-cp-a1');
    const b = await seedTenant('rls-cp-b1');
    const pB = await seedPatient(b.tenantId);
    const apptB = await seedAppointment(b.tenantId, pB.id, b.doctorId);
    const cB = await seedConsultation(b.tenantId, apptB.id, pB.id, b.doctorId, {
      isFinalized: true,
      finalizedAt: new Date(),
      priceMad: '250.00',
      isFree: false,
      paymentStatus: 'awaiting',
    });

    await withTenantTx(a.tenantId, async (tx) => {
      const rows = await tx.execute<{ id: string; price_mad: string | null }>(
        sql`SELECT id, price_mad FROM consultations WHERE id = ${cB.id}::uuid`,
      );
      expect(rows.length).toBe(0);
    });
  });

  it('A cannot UPDATE B pricing fields', async () => {
    const a = await seedTenant('rls-cp-a2');
    const b = await seedTenant('rls-cp-b2');
    const pB = await seedPatient(b.tenantId);
    const apptB = await seedAppointment(b.tenantId, pB.id, b.doctorId);
    const cB = await seedConsultation(b.tenantId, apptB.id, pB.id, b.doctorId, {
      isFinalized: true,
      finalizedAt: new Date(),
      priceMad: '250.00',
      isFree: false,
      paymentStatus: 'awaiting',
    });

    await withTenantTx(a.tenantId, async (tx) => {
      const result = await tx.execute<{ id: string }>(
        sql`UPDATE consultations SET payment_status = 'paid' WHERE id = ${cB.id}::uuid RETURNING id`,
      );
      expect(result.length).toBe(0);
    });
  });

  it('owning tenant CAN read pricing fields', async () => {
    const a = await seedTenant('rls-cp-a3');
    const pA = await seedPatient(a.tenantId);
    const apptA = await seedAppointment(a.tenantId, pA.id, a.doctorId);
    const cA = await seedConsultation(a.tenantId, apptA.id, pA.id, a.doctorId, {
      isFinalized: true,
      finalizedAt: new Date(),
      priceMad: '250.00',
      isFree: false,
      paymentStatus: 'awaiting',
    });

    await withTenantTx(a.tenantId, async (tx) => {
      const rows = await tx.execute<{
        id: string;
        price_mad: string | null;
        payment_status: string;
        is_free: boolean;
      }>(
        sql`SELECT id, price_mad, payment_status, is_free FROM consultations WHERE id = ${cA.id}::uuid`,
      );
      expect(rows.length).toBe(1);
      expect(rows[0].price_mad).toBe('250.00');
      expect(rows[0].payment_status).toBe('awaiting');
      expect(rows[0].is_free).toBe(false);
    });
  });
});
