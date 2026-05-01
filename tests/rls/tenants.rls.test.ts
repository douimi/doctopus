import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { withTenantTx } from '@/db/with-tenant';
import { seedTenant } from '../fixtures/tenants';
import { registerDbCleanup } from './setup';

registerDbCleanup();

describe('RLS — tenants', () => {
  it('A cannot see B', async () => {
    const a = await seedTenant('rls-a');
    const b = await seedTenant('rls-b');

    const rows = await withTenantTx(a.tenantId, async (tx) => {
      return tx.execute<{ id: string }>(sql`SELECT id FROM tenants`);
    });

    const ids = rows.map((r) => r.id);
    expect(ids).toContain(a.tenantId);
    expect(ids).not.toContain(b.tenantId);
  });

  it('A cannot UPDATE B even with explicit WHERE', async () => {
    const a = await seedTenant('rls-c');
    const b = await seedTenant('rls-d');

    await withTenantTx(a.tenantId, async (tx) => {
      const result = await tx.execute<{ id: string }>(sql`UPDATE tenants SET name = 'hacked' WHERE id = ${b.tenantId}::uuid RETURNING id`);
      expect(result.length).toBe(0);
    });

    const admin = dbAdmin();
    const rows = await admin.execute<{ name: string }>(sql`SELECT name FROM tenants WHERE id = ${b.tenantId}::uuid`);
    expect(rows[0]?.name).not.toBe('hacked');
  });

  it('A cannot DELETE B', async () => {
    const a = await seedTenant('rls-e');
    const b = await seedTenant('rls-f');

    await withTenantTx(a.tenantId, async (tx) => {
      const result = await tx.execute<{ id: string }>(sql`DELETE FROM tenants WHERE id = ${b.tenantId}::uuid RETURNING id`);
      expect(result.length).toBe(0);
    });

    const admin = dbAdmin();
    const rows = await admin.execute<{ id: string }>(sql`SELECT id FROM tenants WHERE id = ${b.tenantId}::uuid`);
    expect(rows[0]).toBeDefined();
  });
});
