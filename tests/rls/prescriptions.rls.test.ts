import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { seedTenant } from '../fixtures/tenants';
import { seedPatient } from '../fixtures/patients';
import { seedAppointment } from '../fixtures/appointments';
import { seedConsultation } from '../fixtures/consultations';
import { seedPrescription, seedPrescriptionItem } from '../fixtures/prescriptions';
import { registerDbCleanup } from './setup';

registerDbCleanup();

describe('RLS — prescriptions', () => {
  it('A cannot SELECT B prescriptions or items', async () => {
    const a = await seedTenant('rls-px-a');
    const b = await seedTenant('rls-px-b');
    const pB = await seedPatient(b.tenantId);
    const apptB = await seedAppointment(b.tenantId, pB.id, b.doctorId);
    const cB = await seedConsultation(b.tenantId, apptB.id, pB.id, b.doctorId);
    const presB = await seedPrescription(b.tenantId, cB.id, pB.id, b.doctorId);
    await seedPrescriptionItem(b.tenantId, presB.id, { position: 0 });

    const presRows = await withTenantTx(a.tenantId, async (tx) => {
      return tx.execute(sql`SELECT id FROM prescriptions`);
    });
    expect(presRows.length).toBe(0);

    const itemRows = await withTenantTx(a.tenantId, async (tx) => {
      return tx.execute(sql`SELECT id FROM prescription_items`);
    });
    expect(itemRows.length).toBe(0);
  });
});
