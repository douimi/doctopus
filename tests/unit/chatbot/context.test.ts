import { afterAll, describe, expect, it } from 'vitest';
import { __closeDbForTests } from '@/db/client';
import { buildContext } from '@/lib/chatbot/context';
import { seedTenant } from '../../fixtures/tenants';
import {
  seedPatient,
  seedAllergy,
  seedChronicCondition,
} from '../../fixtures/patients';
import { seedAppointment } from '../../fixtures/appointments';
import { seedConsultation, seedVitals } from '../../fixtures/consultations';

describe('buildContext', () => {
  afterAll(async () => {
    await __closeDbForTests();
  });

  it('includes allergies, conditions, vitals, current consultation', async () => {
    const t = await seedTenant('ctx-a');
    const p = await seedPatient(t.tenantId, {
      firstName: 'Salma',
      lastName: 'Tazi',
      cin: 'AB123456',
      phone: '+212611112222',
      gender: 'f',
      dateOfBirth: '1990-06-15',
    });
    await seedAllergy(t.tenantId, p.id, 'Pénicilline');
    await seedChronicCondition(t.tenantId, p.id, 'HTA');
    const appt = await seedAppointment(t.tenantId, p.id, t.doctorId);
    const c = await seedConsultation(t.tenantId, appt.id, p.id, t.doctorId, {
      motif: 'Maux de tête',
      examNotes: 'Examen normal',
      diagnosis: 'Céphalée de tension',
    });
    await seedVitals(t.tenantId, c.id, { bpSystolic: 120, bpDiastolic: 80 });

    const ctx = await buildContext(t.tenantId, c.id);

    // Includes clinical content
    expect(ctx).toContain('Pénicilline');
    expect(ctx).toContain('HTA');
    expect(ctx).toContain('Maux de tête');
    expect(ctx).toContain('Céphalée de tension');
    expect(ctx).toContain('TA 120/80');
    expect(ctx).toContain('Sexe : F');

    // EXCLUDES patient-identifying free text — these assertions are SECURITY-CRITICAL
    expect(ctx).not.toContain('Salma');
    expect(ctx).not.toContain('Tazi');
    expect(ctx).not.toContain('AB123456');
    expect(ctx).not.toContain('+212611112222');
  });

  it('handles a patient with no allergies / conditions / vitals', async () => {
    const t = await seedTenant('ctx-b');
    const p = await seedPatient(t.tenantId);
    const appt = await seedAppointment(t.tenantId, p.id, t.doctorId);
    const c = await seedConsultation(t.tenantId, appt.id, p.id, t.doctorId);

    const ctx = await buildContext(t.tenantId, c.id);
    expect(ctx).toContain('aucune connue');
    expect(ctx).toContain('aucun connu');
    expect(ctx).toContain('non renseignées');
    expect(ctx).toContain('aucune'); // past consultations
  });
});
