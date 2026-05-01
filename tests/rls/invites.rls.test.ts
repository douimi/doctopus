import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { seedTenant } from '../fixtures/tenants';
import { registerDbCleanup } from './setup';

registerDbCleanup();

describe('RLS — tenant_invites', () => {
  it('authenticated role cannot read tenant_invites', async () => {
    const a = await seedTenant('rls-i-a');

    await withTenantTx(a.tenantId, async (tx) => {
      const rows = await tx.execute(sql`SELECT id FROM tenant_invites`);
      expect(rows.length).toBe(0);
    });
  });

  it('authenticated role cannot INSERT tenant_invites', async () => {
    const a = await seedTenant('rls-i-b');

    await expect(
      withTenantTx(a.tenantId, async (tx) => {
        await tx.execute(
          sql`INSERT INTO tenant_invites (token_hash, kind, expires_at) VALUES ('hash', 'tenant_owner', now() + interval '1 day')`,
        );
      }),
    ).rejects.toThrow();
  });
});
