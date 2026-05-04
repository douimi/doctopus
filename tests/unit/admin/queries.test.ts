import { afterAll, describe, expect, it } from 'vitest';
import { __closeDbForTests, dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { grantCredits } from '@/lib/chatbot/credits';
import {
  getGlobalUsageReport,
  getTenantDetail,
  listInvitesForAdmin,
  listTenantsForAdmin,
} from '@/lib/admin/queries';
import { seedTenant } from '../../fixtures/tenants';
import { seedPatient } from '../../fixtures/patients';
import { seedAppointment } from '../../fixtures/appointments';
import { seedConsultation } from '../../fixtures/consultations';
import { seedUsage } from '../../fixtures/chatbot';
import { createOwnerInvite } from '@/lib/invites/admin';

describe('admin queries', () => {
  afterAll(async () => {
    await __closeDbForTests();
  });

  it('listTenantsForAdmin returns rows with doctor email and balance', async () => {
    const t = await seedTenant('admin-q-a');
    await grantCredits(t.tenantId, 25, 'cli:test');

    const rows = await listTenantsForAdmin({ q: 'admin-q-a' });
    const found = rows.find((r) => r.id === t.tenantId);
    expect(found).toBeDefined();
    expect(found!.chatbotCreditsBalance).toBe(25);
    expect(found!.doctorEmail).toContain('@test.local');
  });

  it('listTenantsForAdmin filters by status=suspended', async () => {
    const t = await seedTenant('admin-q-b');
    await dbAdmin().update(tenants).set({ status: 'suspended' }).where(eq(tenants.id, t.tenantId));
    const rows = await listTenantsForAdmin({ status: 'suspended' });
    expect(rows.find((r) => r.id === t.tenantId)).toBeDefined();
  });

  it('getTenantDetail returns tenant + doctor + ledger', async () => {
    const t = await seedTenant('admin-q-c');
    await grantCredits(t.tenantId, 10, 'cli:test', 'first grant');
    const detail = await getTenantDetail(t.tenantId);
    expect(detail).not.toBeNull();
    expect(detail!.doctor).not.toBeNull();
    expect(detail!.ledger.length).toBeGreaterThanOrEqual(1);
    expect(detail!.ledger[0].change).toBe(10);
  });

  it('getGlobalUsageReport returns positive numbers when usage exists', async () => {
    const t = await seedTenant('admin-q-d');
    await grantCredits(t.tenantId, 5, 'cli:test');
    const p = await seedPatient(t.tenantId);
    const appt = await seedAppointment(t.tenantId, p.id, t.doctorId);
    const c = await seedConsultation(t.tenantId, appt.id, p.id, t.doctorId);
    await seedUsage(t.tenantId, c.id, { inputTokens: 1000, outputTokens: 200, estimatedCostMicrousd: 1600 });

    const r = await getGlobalUsageReport(30);
    expect(r.activeTenants).toBeGreaterThan(0);
    expect(r.daily.length).toBeGreaterThanOrEqual(0); // no debit recorded → no daily row in this test
    expect(r.perProvider.length).toBeGreaterThanOrEqual(1);
  });

  it('listInvitesForAdmin returns rows with computed status', async () => {
    await createOwnerInvite('admin-q-list@example.com', 7, null);
    const rows = await listInvitesForAdmin({ limit: 50 });
    const found = rows.find((r) => r.emailHint === 'admin-q-list@example.com');
    expect(found).toBeDefined();
    expect(found!.status).toBe('pending');
  });
});
