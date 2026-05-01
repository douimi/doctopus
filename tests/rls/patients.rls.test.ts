import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { seedTenant } from '../fixtures/tenants';
import { seedPatient, seedAllergy, seedChronicCondition } from '../fixtures/patients';
import { registerDbCleanup } from './setup';

registerDbCleanup();

describe('RLS — patients', () => {
  it('A cannot SELECT B patients', async () => {
    const a = await seedTenant('rls-p-a');
    const b = await seedTenant('rls-p-b');
    await seedPatient(a.tenantId, { firstName: 'PA' });
    await seedPatient(b.tenantId, { firstName: 'PB' });

    const rows = await withTenantTx(a.tenantId, async (tx) => {
      return tx.execute<{ first_name: string; tenant_id: string }>(
        sql`SELECT first_name, tenant_id FROM patients`,
      );
    });

    const tenantIds = new Set(rows.map((r) => r.tenant_id));
    expect(tenantIds).toContain(a.tenantId);
    expect(tenantIds).not.toContain(b.tenantId);
  });

  it('A cannot INSERT a patient under tenant B', async () => {
    const a = await seedTenant('rls-p-c');
    const b = await seedTenant('rls-p-d');

    await expect(
      withTenantTx(a.tenantId, async (tx) => {
        await tx.execute(sql`
          INSERT INTO patients (tenant_id, first_name, last_name, gender, date_of_birth)
          VALUES (${b.tenantId}::uuid, 'X', 'Y', 'm', '1990-01-01')
        `);
      }),
    ).rejects.toThrow();
  });

  it('A cannot UPDATE B patients', async () => {
    const a = await seedTenant('rls-p-e');
    const b = await seedTenant('rls-p-f');
    const pB = await seedPatient(b.tenantId);

    await withTenantTx(a.tenantId, async (tx) => {
      const result = await tx.execute<{ id: string }>(
        sql`UPDATE patients SET first_name = 'pwn' WHERE id = ${pB.id}::uuid RETURNING id`,
      );
      expect(result.length).toBe(0);
    });
  });

  it('A cannot SELECT B allergies / chronic_conditions', async () => {
    const a = await seedTenant('rls-p-g');
    const b = await seedTenant('rls-p-h');
    const pB = await seedPatient(b.tenantId);
    await seedAllergy(b.tenantId, pB.id, 'Pénicilline');
    await seedChronicCondition(b.tenantId, pB.id, 'HTA');

    await withTenantTx(a.tenantId, async (tx) => {
      const a1 = await tx.execute(sql`SELECT id FROM patient_allergies`);
      const a2 = await tx.execute(sql`SELECT id FROM patient_chronic_conditions`);
      expect(a1.length).toBe(0);
      expect(a2.length).toBe(0);
    });
  });
});
