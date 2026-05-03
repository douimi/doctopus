import { afterAll, describe, expect, it } from 'vitest';
import { __closeDbForTests } from '@/db/client';
import {
  NoCreditsError,
  debitOneCredit,
  getBalance,
  grantCredits,
} from '@/lib/chatbot/credits';
import { seedTenant } from '../../fixtures/tenants';
import { seedPatient } from '../../fixtures/patients';
import { seedAppointment } from '../../fixtures/appointments';
import { seedConsultation } from '../../fixtures/consultations';

describe('credits', () => {
  afterAll(async () => {
    await __closeDbForTests();
  });

  it('grant + balance roundtrip', async () => {
    const t = await seedTenant('credits-a');
    expect(await getBalance(t.tenantId)).toBe(0);

    await grantCredits(t.tenantId, 100, 'cli:test', 'Pack initial');
    expect(await getBalance(t.tenantId)).toBe(100);

    await grantCredits(t.tenantId, 50, 'cli:test');
    expect(await getBalance(t.tenantId)).toBe(150);
  });

  it('debit decrements by 1 and marks consultation', async () => {
    const t = await seedTenant('credits-b');
    await grantCredits(t.tenantId, 5, 'cli:test');

    const p = await seedPatient(t.tenantId);
    const appt = await seedAppointment(t.tenantId, p.id, t.doctorId);
    const c = await seedConsultation(t.tenantId, appt.id, p.id, t.doctorId);

    const result = await debitOneCredit(t.tenantId, c.id);
    expect(result.newBalance).toBe(4);
    expect(result.alreadyDebited).toBe(false);
    expect(await getBalance(t.tenantId)).toBe(4);
  });

  it('debit is idempotent within the same consultation', async () => {
    const t = await seedTenant('credits-c');
    await grantCredits(t.tenantId, 5, 'cli:test');
    const p = await seedPatient(t.tenantId);
    const appt = await seedAppointment(t.tenantId, p.id, t.doctorId);
    const c = await seedConsultation(t.tenantId, appt.id, p.id, t.doctorId);

    const r1 = await debitOneCredit(t.tenantId, c.id);
    expect(r1.alreadyDebited).toBe(false);
    expect(r1.newBalance).toBe(4);

    const r2 = await debitOneCredit(t.tenantId, c.id);
    expect(r2.alreadyDebited).toBe(true);
    expect(r2.newBalance).toBe(4);
    expect(await getBalance(t.tenantId)).toBe(4);
  });

  it('debit throws NoCreditsError when balance is 0', async () => {
    const t = await seedTenant('credits-d');
    const p = await seedPatient(t.tenantId);
    const appt = await seedAppointment(t.tenantId, p.id, t.doctorId);
    const c = await seedConsultation(t.tenantId, appt.id, p.id, t.doctorId);

    await expect(debitOneCredit(t.tenantId, c.id)).rejects.toBeInstanceOf(NoCreditsError);
    expect(await getBalance(t.tenantId)).toBe(0);
  });

  it('grant rejects non-positive count', async () => {
    const t = await seedTenant('credits-e');
    await expect(grantCredits(t.tenantId, 0, 'cli:test')).rejects.toThrow();
    await expect(grantCredits(t.tenantId, -5, 'cli:test')).rejects.toThrow();
    await expect(grantCredits(t.tenantId, 1.5, 'cli:test')).rejects.toThrow();
  });
});
