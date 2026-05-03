import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { seedTenant } from '../fixtures/tenants';
import { seedMedication } from '../fixtures/medications';
import { registerDbCleanup } from './setup';

registerDbCleanup();

describe('RLS — medications (global read)', () => {
  it('any authenticated tenant can SELECT all medications', async () => {
    const a = await seedTenant('rls-m-a');
    await seedMedication({ nomCommercial: 'Brufen-RLS-test', laboratoire: 'Test-Lab-RLS' });

    const rows = await withTenantTx(a.tenantId, async (tx) => {
      return tx.execute<{ nom_commercial: string }>(
        sql`SELECT nom_commercial FROM medications WHERE nom_commercial = 'Brufen-RLS-test'`,
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
