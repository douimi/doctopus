import { describe, expect, it, beforeEach } from 'vitest';
import { dbAdmin } from '@/db/client';
import { tenants, userProfiles, patients, appointments, consultations } from '@/db/schema';
import { listConsultations } from '@/lib/consultations/queries';

describe('listConsultations', () => {
  let tenantA: string;
  let doctorA: string;
  let patientBerrada: string;
  let patientAlami: string;

  beforeEach(async () => {
    const [t] = await dbAdmin().insert(tenants).values({ name: 'List T' }).returning();
    tenantA = t.id;

    const [d] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId: tenantA,
        role: 'doctor',
        fullName: 'Dr List',
        email: `dl-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    doctorA = d.id;

    const [p1] = await dbAdmin()
      .insert(patients)
      .values({ tenantId: tenantA, lastName: 'Berrada', firstName: 'Yasmine', gender: 'f', dateOfBirth: '1990-01-01' })
      .returning();
    patientBerrada = p1.id;
    const [p2] = await dbAdmin()
      .insert(patients)
      .values({ tenantId: tenantA, lastName: 'Alami', firstName: 'Ali', gender: 'm', dateOfBirth: '1985-01-01' })
      .returning();
    patientAlami = p2.id;

    async function seed(patientId: string, consultedAt: Date, opts: Partial<typeof consultations.$inferInsert>) {
      const [appt] = await dbAdmin()
        .insert(appointments)
        .values({
          tenantId: tenantA,
          patientId,
          status: 'done',
          kind: 'walkin',
          createdBy: doctorA,
          startedAt: consultedAt,
          endedAt: consultedAt,
        })
        .returning();
      await dbAdmin()
        .insert(consultations)
        .values({
          tenantId: tenantA,
          appointmentId: appt.id,
          patientId,
          doctorId: doctorA,
          consultedAt,
          ...opts,
        });
    }

    const today = new Date();
    const yesterday = new Date(Date.now() - 86_400_000);
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000);

    await seed(patientBerrada, today, {
      isFinalized: true,
      finalizedAt: today,
      priceMad: '250.00',
      paymentStatus: 'paid',
      paymentMethod: 'especes',
      paidAt: today,
      paidBy: doctorA,
    });
    await seed(patientBerrada, yesterday, {
      isFinalized: true,
      finalizedAt: yesterday,
      priceMad: '300.00',
      paymentStatus: 'awaiting',
      motif: 'Toux persistante',
    });
    await seed(patientAlami, twoDaysAgo, {
      isFinalized: true,
      finalizedAt: twoDaysAgo,
      priceMad: null,
      isFree: true,
      paymentStatus: 'free',
      paidAt: twoDaysAgo,
      paidBy: doctorA,
    });

    // A consultation in a different tenant (must NOT appear).
    const [otherT] = await dbAdmin().insert(tenants).values({ name: 'Other List T' }).returning();
    const [otherDoc] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId: otherT.id,
        role: 'doctor',
        fullName: 'Dr Other',
        email: `dol-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    const [otherP] = await dbAdmin()
      .insert(patients)
      .values({ tenantId: otherT.id, lastName: 'Berrada', firstName: 'Cross-tenant', gender: 'm', dateOfBirth: '1980-01-01' })
      .returning();
    const [otherAppt] = await dbAdmin()
      .insert(appointments)
      .values({
        tenantId: otherT.id,
        patientId: otherP.id,
        status: 'done',
        kind: 'walkin',
        createdBy: otherDoc.id,
        startedAt: today,
        endedAt: today,
      })
      .returning();
    await dbAdmin()
      .insert(consultations)
      .values({
        tenantId: otherT.id,
        appointmentId: otherAppt.id,
        patientId: otherP.id,
        doctorId: otherDoc.id,
        consultedAt: today,
        priceMad: '999.00',
      });
  });

  it('returns all 3 rows for the tenant, ordered by consultedAt DESC', async () => {
    const rows = await listConsultations(tenantA, '');
    expect(rows.length).toBe(3);
    expect(rows[0].patientFullName).toMatch(/Berrada/);
    expect(rows[2].patientFullName).toMatch(/Alami/);
  });

  it('filters by patient last name (case-insensitive)', async () => {
    const rows = await listConsultations(tenantA, 'berrada');
    expect(rows.length).toBe(2);
    rows.forEach((r) => expect(r.patientFullName).toMatch(/Berrada/));
  });

  it('filters by patient first name (case-insensitive)', async () => {
    const rows = await listConsultations(tenantA, 'ali');
    // 'ali' matches 'Alami' (lastName ILIKE %ali%) AND 'Ali' (firstName ILIKE %ali%) — same patient row.
    expect(rows.length).toBe(1);
    expect(rows[0].patientFullName).toMatch(/Alami Ali/);
  });

  it('returns empty array on no match', async () => {
    const rows = await listConsultations(tenantA, 'NOPE');
    expect(rows).toEqual([]);
  });

  it('isolates by tenant', async () => {
    const rows = await listConsultations(tenantA, 'Berrada');
    // The cross-tenant Berrada row must NOT appear.
    expect(rows.length).toBe(2);
    rows.forEach((r) => expect(r.patientFullName).not.toContain('Cross-tenant'));
  });

  it('propagates payment fields correctly', async () => {
    const rows = await listConsultations(tenantA, '');
    const paid = rows.find((r) => r.paymentStatus === 'paid');
    const awaiting = rows.find((r) => r.paymentStatus === 'awaiting');
    const free = rows.find((r) => r.paymentStatus === 'free');
    expect(paid).toBeDefined();
    expect(awaiting).toBeDefined();
    expect(free).toBeDefined();
    expect(paid!.priceMad).toBe('250.00');
    expect(awaiting!.priceMad).toBe('300.00');
    expect(free!.priceMad).toBeNull();
    expect(awaiting!.motif).toBe('Toux persistante');
  });

  it('respects an explicit limit', async () => {
    const rows = await listConsultations(tenantA, '', { limit: 2 });
    expect(rows.length).toBe(2);
  });
});
