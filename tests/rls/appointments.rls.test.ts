import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { seedTenant } from '../fixtures/tenants';
import { seedPatient } from '../fixtures/patients';
import { seedAppointment } from '../fixtures/appointments';
import { registerDbCleanup } from './setup';

registerDbCleanup();

describe('RLS — appointments', () => {
  it('A cannot SELECT B appointments', async () => {
    const a = await seedTenant('rls-a-a');
    const b = await seedTenant('rls-a-b');
    const pB = await seedPatient(b.tenantId);
    await seedAppointment(b.tenantId, pB.id, b.doctorId);

    const rows = await withTenantTx(a.tenantId, async (tx) => {
      return tx.execute<{ tenant_id: string }>(sql`SELECT tenant_id FROM appointments`);
    });
    const tenantIds = new Set(rows.map((r) => r.tenant_id));
    expect(tenantIds).not.toContain(b.tenantId);
  });

  it('A cannot UPDATE B appointments', async () => {
    const a = await seedTenant('rls-a-c');
    const b = await seedTenant('rls-a-d');
    const pB = await seedPatient(b.tenantId);
    const apptB = await seedAppointment(b.tenantId, pB.id, b.doctorId);

    await withTenantTx(a.tenantId, async (tx) => {
      const result = await tx.execute<{ id: string }>(
        sql`UPDATE appointments SET status = 'cancelled' WHERE id = ${apptB.id}::uuid RETURNING id`,
      );
      expect(result.length).toBe(0);
    });
  });

  it('A cannot INSERT an appointment under tenant B', async () => {
    const a = await seedTenant('rls-a-e');
    const b = await seedTenant('rls-a-f');
    const pB = await seedPatient(b.tenantId);

    await expect(
      withTenantTx(a.tenantId, async (tx) => {
        await tx.execute(sql`
          INSERT INTO appointments (tenant_id, patient_id, status, kind, created_by)
          VALUES (${b.tenantId}::uuid, ${pB.id}::uuid, 'scheduled', 'scheduled', ${a.doctorId}::uuid)
        `);
      }),
    ).rejects.toThrow();
  });
});
