import { describe, expect, it, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { tenants, userProfiles, patients, appointments, consultations } from '@/db/schema';
import { updatePatientHistory } from '@/lib/patients/mutations';
import { getLatestHistoryNote } from '@/lib/consultations/queries';

describe('patient-level antécédents', () => {
  let tenantId: string;
  let doctorId: string;
  let patientId: string;

  async function seedConsultation(consultedAt: Date, historyNotes: string | null) {
    const [appt] = await dbAdmin()
      .insert(appointments)
      .values({
        tenantId,
        patientId,
        status: 'done',
        kind: 'walkin',
        createdBy: doctorId,
        startedAt: consultedAt,
        endedAt: consultedAt,
      })
      .returning();
    const [c] = await dbAdmin()
      .insert(consultations)
      .values({ tenantId, appointmentId: appt.id, patientId, doctorId, consultedAt, historyNotes })
      .returning();
    return c.id;
  }

  beforeEach(async () => {
    const [t] = await dbAdmin().insert(tenants).values({ name: 'History T' }).returning();
    tenantId = t.id;
    const [d] = await dbAdmin()
      .insert(userProfiles)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        role: 'doctor',
        fullName: 'Dr H',
        email: `dh-${Date.now()}-${Math.random().toString(36).slice(2)}@test.example`,
      })
      .returning();
    doctorId = d.id;
    const [p] = await dbAdmin()
      .insert(patients)
      .values({ tenantId, lastName: 'Tazi', firstName: 'Omar', gender: 'm' })
      .returning();
    patientId = p.id;
  });

  it('saves structured fields, nulls empty ones and stamps the update', async () => {
    const row = await updatePatientHistory(tenantId, {
      patientId,
      historyMedical: 'HTA',
      historySurgical: '',
      historyFamily: 'Père diabétique',
      historyTreatments: 'Amlodipine 5 mg',
      historyLifestyle: '',
    });
    expect(row?.historyMedical).toBe('HTA');
    expect(row?.historySurgical).toBeNull();
    expect(row?.historyUpdatedAt).toBeInstanceOf(Date);
    const [stored] = await dbAdmin().select().from(patients).where(eq(patients.id, patientId));
    expect(stored.historyFamily).toBe('Père diabétique');
  });

  it('returns the latest non-empty consultation note, excluding the current one', async () => {
    const day = 86_400_000;
    await seedConsultation(new Date(Date.now() - 30 * day), 'Asthme enfance');
    await seedConsultation(new Date(Date.now() - 10 * day), '   ');
    const current = await seedConsultation(new Date(), 'Note du jour');

    const note = await getLatestHistoryNote(tenantId, patientId, current);
    expect(note?.text).toBe('Asthme enfance');
    const withCurrent = await getLatestHistoryNote(tenantId, patientId);
    expect(withCurrent?.text).toBe('Note du jour');
  });

  it('returns null when no consultation has a note', async () => {
    await seedConsultation(new Date(), null);
    expect(await getLatestHistoryNote(tenantId, patientId)).toBeNull();
  });
});
