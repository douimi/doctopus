import { describe, expect, it, beforeEach } from 'vitest';
import { dbAdmin } from '@/db/client';
import {
  tenants,
  userProfiles,
  patients,
  appointments,
  consultations,
  prescriptions,
  prescriptionItems,
} from '@/db/schema';
import {
  STATIC_POSOLOGIES,
  STATIC_DURATIONS,
  mergeUnique,
  getAutocompleteSuggestions,
} from '@/lib/prescriptions/autocomplete';

describe('mergeUnique', () => {
  it('returns the static list when history is empty', () => {
    const out = mergeUnique([], STATIC_POSOLOGIES);
    expect(out.length).toBe(STATIC_POSOLOGIES.length);
    expect(out[0]).toBe(STATIC_POSOLOGIES[0]);
  });

  it('places history before static, deduping case-insensitively', () => {
    const out = mergeUnique(['x', 'y'], ['Y', 'z']);
    expect(out).toEqual(['x', 'y', 'z']);
  });

  it('preserves the history form on case/space dedup (history wins)', () => {
    const out = mergeUnique(['  1 CP  '], ['1 cp']);
    expect(out.length).toBe(1);
    expect(out[0]).toBe('  1 CP  ');
  });

  it('drops empty / whitespace history entries but keeps the static list', () => {
    const out = mergeUnique(['', '  '], ['a', 'b']);
    expect(out).toEqual(['a', 'b']);
  });
});

describe('getAutocompleteSuggestions', () => {
  let tenantA: string;
  let doctorA: string;
  let otherDoctor: string;
  let patientA: string;
  let appointmentA: string;
  let consultationA: string;

  async function newPrescriptionWithItems(
    tenantId: string,
    consultationId: string,
    patientId: string,
    doctorId: string,
    items: Array<{ posologie: string | null; duration: string | null }>,
  ) {
    const [p] = await dbAdmin()
      .insert(prescriptions)
      .values({ tenantId, consultationId, patientId, doctorId })
      .returning();
    let pos = 0;
    for (const it of items) {
      await dbAdmin().insert(prescriptionItems).values({
        tenantId,
        prescriptionId: p.id,
        position: pos++,
        medicationLabelSnapshot: 'Test Med',
        posologie: it.posologie,
        duration: it.duration,
      });
    }
  }

  beforeEach(async () => {
    const [t] = await dbAdmin().insert(tenants).values({ name: 'AC Tenant' }).returning();
    tenantA = t.id;

    const [d] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId: tenantA,
        role: 'doctor',
        fullName: 'Dr AC',
        email: `dac-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    doctorA = d.id;

    const [d2] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId: tenantA,
        role: 'assistant',
        fullName: 'Other AC',
        email: `oac-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    otherDoctor = d2.id;

    const [p] = await dbAdmin()
      .insert(patients)
      .values({ tenantId: tenantA, lastName: 'AC', firstName: 'P', gender: 'm', dateOfBirth: '1990-01-01' })
      .returning();
    patientA = p.id;

    const [a] = await dbAdmin()
      .insert(appointments)
      .values({
        tenantId: tenantA,
        patientId: patientA,
        status: 'done',
        kind: 'walkin',
        createdBy: doctorA,
        startedAt: new Date(),
        endedAt: new Date(),
      })
      .returning();
    appointmentA = a.id;

    const [c] = await dbAdmin()
      .insert(consultations)
      .values({
        tenantId: tenantA,
        appointmentId: appointmentA,
        patientId: patientA,
        doctorId: doctorA,
        isFinalized: true,
        finalizedAt: new Date(),
        priceMad: '250.00',
      })
      .returning();
    consultationA = c.id;
  });

  it('returns the static list for a doctor with no history', async () => {
    const r = await getAutocompleteSuggestions(tenantA, doctorA);
    expect(r.posologies.length).toBe(STATIC_POSOLOGIES.length);
    expect(r.durations.length).toBe(STATIC_DURATIONS.length);
  });

  it('places the doctor most-used posologie first, then the static list', async () => {
    await newPrescriptionWithItems(tenantA, consultationA, patientA, doctorA, [
      { posologie: '1 cp matin et soir', duration: '7 jours' },
      { posologie: '1 cp matin et soir', duration: '7 jours' },
      { posologie: '1 cp matin et soir', duration: '7 jours' },
      { posologie: '2 cps par jour', duration: null },
    ]);
    const r = await getAutocompleteSuggestions(tenantA, doctorA);
    expect(r.posologies[0]).toBe('1 cp matin et soir');
    expect(r.posologies[1]).toBe('2 cps par jour');
  });

  it('isolates by doctor (only the queried doctor history surfaces)', async () => {
    await newPrescriptionWithItems(tenantA, consultationA, patientA, otherDoctor, [
      { posologie: 'OTHER DOCTOR ONLY', duration: null },
      { posologie: 'OTHER DOCTOR ONLY', duration: null },
    ]);
    const r = await getAutocompleteSuggestions(tenantA, doctorA);
    expect(r.posologies).not.toContain('OTHER DOCTOR ONLY');
  });

  it('isolates by tenant', async () => {
    const [otherT] = await dbAdmin().insert(tenants).values({ name: 'Other AC T' }).returning();
    const [otherDoc] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId: otherT.id,
        role: 'doctor',
        fullName: 'Dr OAC',
        email: `doac-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    const [otherP] = await dbAdmin()
      .insert(patients)
      .values({ tenantId: otherT.id, lastName: 'OAC', firstName: 'P', gender: 'f', dateOfBirth: '1990-01-01' })
      .returning();
    const [otherAppt] = await dbAdmin()
      .insert(appointments)
      .values({
        tenantId: otherT.id,
        patientId: otherP.id,
        status: 'done',
        kind: 'walkin',
        createdBy: otherDoc.id,
        startedAt: new Date(),
        endedAt: new Date(),
      })
      .returning();
    const [otherC] = await dbAdmin()
      .insert(consultations)
      .values({
        tenantId: otherT.id,
        appointmentId: otherAppt.id,
        patientId: otherP.id,
        doctorId: otherDoc.id,
        isFinalized: true,
        finalizedAt: new Date(),
        priceMad: '250.00',
      })
      .returning();
    await newPrescriptionWithItems(otherT.id, otherC.id, otherP.id, otherDoc.id, [
      { posologie: 'CROSS-TENANT POSOLOGIE', duration: 'CROSS-TENANT DURATION' },
    ]);

    const r = await getAutocompleteSuggestions(tenantA, doctorA);
    expect(r.posologies).not.toContain('CROSS-TENANT POSOLOGIE');
    expect(r.durations).not.toContain('CROSS-TENANT DURATION');
  });

  it('returns durations history first', async () => {
    await newPrescriptionWithItems(tenantA, consultationA, patientA, doctorA, [
      { posologie: null, duration: '12 jours' },
      { posologie: null, duration: '12 jours' },
      { posologie: null, duration: '8 jours' },
    ]);
    const r = await getAutocompleteSuggestions(tenantA, doctorA);
    expect(r.durations[0]).toBe('12 jours');
    expect(r.durations[1]).toBe('8 jours');
  });
});
