import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { seedTenant } from '../fixtures/tenants';
import { seedPatient } from '../fixtures/patients';
import { seedAppointment } from '../fixtures/appointments';
import { seedConsultation } from '../fixtures/consultations';
import { seedChatMessage, seedLedgerGrant, seedUsage } from '../fixtures/chatbot';
import { registerDbCleanup } from './setup';

registerDbCleanup();

describe('RLS — chatbot tables', () => {
  it('A cannot SELECT B chat messages', async () => {
    const a = await seedTenant('rls-cb-a');
    const b = await seedTenant('rls-cb-b');
    const pB = await seedPatient(b.tenantId);
    const apptB = await seedAppointment(b.tenantId, pB.id, b.doctorId);
    const cB = await seedConsultation(b.tenantId, apptB.id, pB.id, b.doctorId);
    await seedChatMessage(b.tenantId, cB.id, 'user', 'secret message');

    const rows = await withTenantTx(a.tenantId, async (tx) => {
      return tx.execute(sql`SELECT id FROM consultation_chat_messages`);
    });
    expect(rows.length).toBe(0);
  });

  it('A cannot SELECT B credit ledger', async () => {
    const a = await seedTenant('rls-cb-c');
    const b = await seedTenant('rls-cb-d');
    await seedLedgerGrant(b.tenantId, 100);

    const rows = await withTenantTx(a.tenantId, async (tx) => {
      return tx.execute(sql`SELECT id FROM chatbot_credit_ledger`);
    });
    expect(rows.length).toBe(0);
  });

  it('authenticated cannot INSERT into ledger (service-role only)', async () => {
    const a = await seedTenant('rls-cb-e');

    await expect(
      withTenantTx(a.tenantId, async (tx) => {
        await tx.execute(
          sql`INSERT INTO chatbot_credit_ledger (tenant_id, change, reason) VALUES (${a.tenantId}::uuid, 50, 'grant')`,
        );
      }),
    ).rejects.toThrow();
  });

  it('A cannot SELECT B usage', async () => {
    const a = await seedTenant('rls-cb-f');
    const b = await seedTenant('rls-cb-g');
    const pB = await seedPatient(b.tenantId);
    const apptB = await seedAppointment(b.tenantId, pB.id, b.doctorId);
    const cB = await seedConsultation(b.tenantId, apptB.id, pB.id, b.doctorId);
    await seedUsage(b.tenantId, cB.id);

    const rows = await withTenantTx(a.tenantId, async (tx) => {
      return tx.execute(sql`SELECT id FROM chatbot_usage`);
    });
    expect(rows.length).toBe(0);
  });

  it('authenticated cannot INSERT into usage (service-role only)', async () => {
    const a = await seedTenant('rls-cb-h');
    const pA = await seedPatient(a.tenantId);
    const apptA = await seedAppointment(a.tenantId, pA.id, a.doctorId);
    const cA = await seedConsultation(a.tenantId, apptA.id, pA.id, a.doctorId);

    await expect(
      withTenantTx(a.tenantId, async (tx) => {
        await tx.execute(
          sql`INSERT INTO chatbot_usage (tenant_id, consultation_id, provider, model, input_tokens, output_tokens) VALUES (${a.tenantId}::uuid, ${cA.id}::uuid, 'anthropic', 'x', 1, 1)`,
        );
      }),
    ).rejects.toThrow();
  });
});
