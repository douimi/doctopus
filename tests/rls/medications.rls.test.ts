import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { withTenantTx } from '@/db/with-tenant';
import { seedTenant } from '../fixtures/tenants';
import { seedMedication } from '../fixtures/medications';
import { registerDbCleanup } from './setup';

registerDbCleanup();

describe('RLS — medications (global read)', () => {
  it('any authenticated tenant can SELECT all medications', async () => {
    const a = await seedTenant('rls-m-a');
    const name = `Brufen-RLS-${randomUUID().slice(0, 8)}`;
    await seedMedication({
      nomCommercial: name,
      laboratoire: `Test-${randomUUID().slice(0, 6)}`,
    });

    const rows = await withTenantTx(a.tenantId, async (tx) => {
      return tx.execute<{ nom_commercial: string }>(
        sql`SELECT nom_commercial FROM medications WHERE nom_commercial = ${name}`,
      );
    });
    expect(rows.length).toBe(1);
  });

  it('authenticated cannot INSERT', async () => {
    const a = await seedTenant('rls-m-b');

    await expect(
      withTenantTx(a.tenantId, async (tx) => {
        await tx.execute(
          sql`INSERT INTO medications (nom_commercial, dci) VALUES ('Spoof', 'Spoof')`,
        );
      }),
    ).rejects.toThrow();
  });
});
