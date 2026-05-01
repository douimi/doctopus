import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { seedTenant } from '../fixtures/tenants';
import { seedPatient } from '../fixtures/patients';
import { seedAppointment } from '../fixtures/appointments';
import { seedConsultation, seedVitals } from '../fixtures/consultations';
import { registerDbCleanup } from './setup';

registerDbCleanup();

describe('RLS — consultations', () => {
  it('A cannot SELECT B consultations', async () => {
    const a = await seedTenant('rls-c-a');
    const b = await seedTenant('rls-c-b');
    const pB = await seedPatient(b.tenantId);
    const apptB = await seedAppointment(b.tenantId, pB.id, b.doctorId);
    await seedConsultation(b.tenantId, apptB.id, pB.id, b.doctorId, { motif: 'secret' });

    const rows = await withTenantTx(a.tenantId, async (tx) => {
      return tx.execute<{ tenant_id: string }>(sql`SELECT tenant_id FROM consultations`);
    });
    const tenantIds = new Set(rows.map((r) => r.tenant_id));
    expect(tenantIds).not.toContain(b.tenantId);
  });

  it('A cannot UPDATE B consultations', async () => {
    const a = await seedTenant('rls-c-c');
    const b = await seedTenant('rls-c-d');
    const pB = await seedPatient(b.tenantId);
    const apptB = await seedAppointment(b.tenantId, pB.id, b.doctorId);
    const cB = await seedConsultation(b.tenantId, apptB.id, pB.id, b.doctorId);

    await withTenantTx(a.tenantId, async (tx) => {
      const result = await tx.execute<{ id: string }>(
        sql`UPDATE consultations SET diagnosis = 'pwn' WHERE id = ${cB.id}::uuid RETURNING id`,
      );
      expect(result.length).toBe(0);
    });
  });

  it('A cannot SELECT B vitals', async () => {
    const a = await seedTenant('rls-c-e');
    const b = await seedTenant('rls-c-f');
    const pB = await seedPatient(b.tenantId);
    const apptB = await seedAppointment(b.tenantId, pB.id, b.doctorId);
    const cB = await seedConsultation(b.tenantId, apptB.id, pB.id, b.doctorId);
    await seedVitals(b.tenantId, cB.id, { bpSystolic: 130, bpDiastolic: 80 });

    await withTenantTx(a.tenantId, async (tx) => {
      const rows = await tx.execute(sql`SELECT id FROM consultation_vitals`);
      expect(rows.length).toBe(0);
    });
  });
});
