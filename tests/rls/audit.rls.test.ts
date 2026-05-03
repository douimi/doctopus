import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { withTenantTx } from '@/db/with-tenant';
import { auditLog } from '@/db/schema';
import { seedTenant } from '../fixtures/tenants';
import { registerDbCleanup } from './setup';

registerDbCleanup();

describe('RLS — audit_log', () => {
  it('A cannot SELECT B audit rows', async () => {
    const a = await seedTenant('rls-audit-a');
    const b = await seedTenant('rls-audit-b');

    await dbAdmin().insert(auditLog).values({
      tenantId: b.tenantId,
      actorUserId: b.doctorId,
      action: 'patient.create',
      entityType: 'patient',
    });

    const rows = await withTenantTx(a.tenantId, async (tx) => {
      return tx.execute(sql`SELECT id FROM audit_log`);
    });
    expect(rows.length).toBe(0);
  });

  it('authenticated cannot UPDATE existing audit rows (no policy)', async () => {
    const a = await seedTenant('rls-audit-c');
    const [row] = await dbAdmin()
      .insert(auditLog)
      .values({
        tenantId: a.tenantId,
        actorUserId: a.doctorId,
        action: 'patient.create',
      })
      .returning();

    await withTenantTx(a.tenantId, async (tx) => {
      const result = await tx.execute(
        sql`UPDATE audit_log SET action = 'tampered' WHERE id = ${row.id}::uuid RETURNING id`,
      );
      expect((result as unknown as Array<unknown>).length).toBe(0);
    });
  });

  it('authenticated cannot DELETE audit rows', async () => {
    const a = await seedTenant('rls-audit-d');
    const [row] = await dbAdmin()
      .insert(auditLog)
      .values({
        tenantId: a.tenantId,
        actorUserId: a.doctorId,
        action: 'patient.create',
      })
      .returning();

    await withTenantTx(a.tenantId, async (tx) => {
      const result = await tx.execute(
        sql`DELETE FROM audit_log WHERE id = ${row.id}::uuid RETURNING id`,
      );
      expect((result as unknown as Array<unknown>).length).toBe(0);
    });
  });
});
