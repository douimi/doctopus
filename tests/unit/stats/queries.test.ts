import { describe, expect, it, beforeEach } from 'vitest';
import { dbAdmin } from '@/db/client';
import { consultations, appointments, patients, userProfiles, tenants } from '@/db/schema';
import {
  getRevenueSummary,
  getRevenueByDay,
  getRevenueByMethod,
  getOutstandingPayments,
  getTopPatients,
} from '@/lib/stats/queries';

describe('stats queries', () => {
  let tenantId: string;
  let doctorId: string;
  let assistantId: string;
  let patientId1: string;
  let patientId2: string;

  beforeEach(async () => {
    const [t] = await dbAdmin().insert(tenants).values({ name: 'S Tenant' }).returning();
    tenantId = t.id;

    const [d] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'doctor',
        fullName: 'Dr. S',
        email: `ds-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    doctorId = d.id;

    const [a] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'assistant',
        fullName: 'A. S',
        email: `as-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    assistantId = a.id;

    const [p1] = await dbAdmin()
      .insert(patients)
      .values({ tenantId, lastName: 'Berrada', firstName: 'Yasmine', gender: 'f', dateOfBirth: '1990-01-01' })
      .returning();
    patientId1 = p1.id;
    const [p2] = await dbAdmin()
      .insert(patients)
      .values({ tenantId, lastName: 'Alami', firstName: 'Ali', gender: 'm', dateOfBirth: '1985-01-01' })
      .returning();
    patientId2 = p2.id;

    async function seed(
      patientId: string,
      paymentStatus: 'paid' | 'awaiting' | 'free',
      method: 'especes' | 'carte' | 'cheque' | 'virement' | 'autre' | null,
      priceMad: string | null,
      paidAt: Date | null,
      finalizedAt: Date,
    ) {
      const [appt] = await dbAdmin()
        .insert(appointments)
        .values({
          tenantId,
          patientId,
          status: 'done',
          kind: 'walkin',
          createdBy: doctorId,
          startedAt: finalizedAt,
          endedAt: finalizedAt,
        })
        .returning();
      await dbAdmin()
        .insert(consultations)
        .values({
          tenantId,
          appointmentId: appt.id,
          patientId,
          doctorId,
          isFinalized: true,
          finalizedAt,
          priceMad: priceMad,
          isFree: paymentStatus === 'free',
          paymentStatus,
          paymentMethod: method,
          paidAt,
          paidBy:
            paymentStatus === 'awaiting' ? null : paymentStatus === 'paid' ? assistantId : doctorId,
        });
    }

    const today = new Date();
    const yesterday = new Date(Date.now() - 86_400_000);
    // Today: 2 paid (250 espèces, 300 carte for patient1), 1 awaiting (200 for patient2), 1 free (patient1).
    await seed(patientId1, 'paid', 'especes', '250.00', today, today);
    await seed(patientId1, 'paid', 'carte', '300.00', today, today);
    await seed(patientId2, 'awaiting', null, '200.00', null, today);
    await seed(patientId1, 'free', null, null, today, today);

    // Yesterday: 1 paid (350 cheque for patient2).
    await seed(patientId2, 'paid', 'cheque', '350.00', yesterday, yesterday);
  });

  describe('getRevenueSummary', () => {
    it('30d range counts everything seeded', async () => {
      const r = await getRevenueSummary(tenantId, '30d');
      expect(r.totalCount).toBe(5);
      expect(r.paidCount).toBe(3);
      expect(r.awaitingCount).toBe(1);
      expect(r.freeCount).toBe(1);
      expect(Number(r.totalRevenue)).toBeCloseTo(900); // 250+300+350
      expect(Number(r.avgPrice)).toBeCloseTo(275); // (250+300+200+350)/4 — excludes free
      expect(Number(r.awaitingTotal)).toBeCloseTo(200);
    });

    it('today range excludes yesterday', async () => {
      const r = await getRevenueSummary(tenantId, 'today');
      expect(r.totalCount).toBe(4);
      expect(r.paidCount).toBe(2);
      expect(Number(r.totalRevenue)).toBeCloseTo(250 + 300);
    });
  });

  describe('getRevenueByDay', () => {
    it('30d returns rows for both today and yesterday', async () => {
      const rows = await getRevenueByDay(tenantId, '30d');
      expect(rows.length).toBeGreaterThanOrEqual(2);
      const totalRev = rows.reduce((sum, r) => sum + Number(r.revenue), 0);
      expect(totalRev).toBeCloseTo(900);
    });

    it('attributes revenue to the correct Casablanca-local day buckets', async () => {
      const rows = await getRevenueByDay(tenantId, '30d');
      const byDate = Object.fromEntries(rows.map((r) => [r.date, Number(r.revenue)]));
      const todayLocal = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' });
      const yesterdayLocal = new Date(Date.now() - 86_400_000).toLocaleDateString('en-CA', {
        timeZone: 'Africa/Casablanca',
      });
      expect(byDate[todayLocal]).toBeCloseTo(550); // 250 + 300
      expect(byDate[yesterdayLocal]).toBeCloseTo(350);
    });
  });

  describe('getRevenueByMethod', () => {
    it('30d returns one row per method seen', async () => {
      const rows = await getRevenueByMethod(tenantId, '30d');
      const byMethod = Object.fromEntries(rows.map((r) => [r.method, Number(r.revenue)]));
      expect(byMethod.especes).toBeCloseTo(250);
      expect(byMethod.carte).toBeCloseTo(300);
      expect(byMethod.cheque).toBeCloseTo(350);
      expect(byMethod.virement).toBeUndefined();
      expect(byMethod.autre).toBeUndefined();
    });
  });

  describe('getOutstandingPayments', () => {
    it('30d returns the awaiting row', async () => {
      const rows = await getOutstandingPayments(tenantId, '30d');
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].priceMad)).toBeCloseTo(200);
      expect(rows[0].patientFullName.toLowerCase()).toContain('alami');
    });
  });

  describe('getTopPatients', () => {
    it('30d returns patients ordered by paid revenue', async () => {
      const rows = await getTopPatients(tenantId, '30d', 10);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      // patient1 paid: 250 + 300 = 550. patient2 paid: 350. patient1 first.
      expect(rows[0].patientFullName.toLowerCase()).toContain('berrada');
      expect(Number(rows[0].revenue)).toBeCloseTo(550);
      expect(Number(rows[1].revenue)).toBeCloseTo(350);
    });

    it('respects the limit', async () => {
      const rows = await getTopPatients(tenantId, '30d', 1);
      expect(rows).toHaveLength(1);
    });
  });
});
