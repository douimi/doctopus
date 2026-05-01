import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.local' });

import { __closeDbForTests, dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';
import { withTenantTx } from '@/db/with-tenant';
import { randomUUID } from 'node:crypto';

describe('withTenantTx', () => {
  let tenantA: string;
  let tenantB: string;

  beforeAll(async () => {
    const admin = dbAdmin();
    const [a] = await admin.insert(tenants).values({ name: 'Cabinet A' }).returning();
    const [b] = await admin.insert(tenants).values({ name: 'Cabinet B' }).returning();
    tenantA = a.id;
    tenantB = b.id;
  });

  afterAll(async () => {
    await __closeDbForTests();
  });

  it('sets app.tenant_id within the transaction', async () => {
    const seen = await withTenantTx(tenantA, async (tx) => {
      const rows = await tx.execute<{ t: string }>(sql`SELECT current_setting('app.tenant_id', true) AS t`);
      return rows[0]?.t;
    });
    expect(seen).toBe(tenantA);
  });

  it('rolls back on throw', async () => {
    const marker = `marker-${randomUUID()}`;
    await expect(
      withTenantTx(tenantA, async (tx) => {
        await tx.execute(sql`UPDATE tenants SET name = ${marker} WHERE id = ${tenantA}::uuid`);
        throw new Error('rollback please');
      }),
    ).rejects.toThrow('rollback please');

    const admin = dbAdmin();
    const rows = await admin.execute<{ name: string }>(sql`SELECT name FROM tenants WHERE id = ${tenantA}::uuid`);
    expect(rows[0]?.name).not.toBe(marker);
  });

  it('isolates concurrent transactions', async () => {
    const [a, b] = await Promise.all([
      withTenantTx(tenantA, async (tx) => {
        const rows = await tx.execute<{ t: string }>(sql`SELECT current_setting('app.tenant_id', true) AS t`);
        return rows[0]?.t;
      }),
      withTenantTx(tenantB, async (tx) => {
        const rows = await tx.execute<{ t: string }>(sql`SELECT current_setting('app.tenant_id', true) AS t`);
        return rows[0]?.t;
      }),
    ]);
    expect(a).toBe(tenantA);
    expect(b).toBe(tenantB);
  });
});
