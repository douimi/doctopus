import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { withTenantTx } from '@/db/with-tenant';
import { seedTenant } from '../fixtures/tenants';
import { registerDbCleanup } from './setup';

registerDbCleanup();

describe('RLS — user_profiles', () => {
  it('A cannot SELECT B users', async () => {
    const a = await seedTenant('rls-u-a');
    const b = await seedTenant('rls-u-b');

    const rows = await withTenantTx(a.tenantId, async (tx) => {
      return tx.execute<{ id: string; tenant_id: string }>(sql`SELECT id, tenant_id FROM user_profiles`);
    });

    const tenantIds = new Set(rows.map((r) => r.tenant_id));
    expect(tenantIds).toContain(a.tenantId);
    expect(tenantIds).not.toContain(b.tenantId);
  });

  it('A cannot INSERT a user_profile for tenant B (RLS WITH CHECK rejects)', async () => {
    const a = await seedTenant('rls-u-c');
    const b = await seedTenant('rls-u-d');

    await expect(
      withTenantTx(a.tenantId, async (tx) => {
        await tx.execute(
          sql`INSERT INTO user_profiles (id, tenant_id, role, full_name, email) VALUES (${randomUUID()}::uuid, ${b.tenantId}::uuid, 'assistant', 'X', ${`spoof-${randomUUID()}@x`})`,
        );
      }),
    ).rejects.toThrow();
  });

  it('A cannot UPDATE B users', async () => {
    const a = await seedTenant('rls-u-e');
    const b = await seedTenant('rls-u-f');

    await withTenantTx(a.tenantId, async (tx) => {
      const result = await tx.execute<{ id: string }>(
        sql`UPDATE user_profiles SET full_name = 'pwn' WHERE id = ${b.doctorId}::uuid RETURNING id`,
      );
      expect(result.length).toBe(0);
    });
  });
});
