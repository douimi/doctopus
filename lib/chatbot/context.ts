import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import {
  consultations,
  patients,
  patientAllergies,
  patientChronicConditions,
  consultationVitals,
  prescriptions,
  prescriptionItems,
} from '@/db/schema';
import { ageFromDob } from '@/lib/patients/age';
import { MAX_INPUT_TOKEN_BUDGET } from './pricing';

export class ContextTooLargeError extends Error {
  code = 'context_too_large' as const;
}

function lines(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join('\n');
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * Build the structured French-language patient context block sent to the LLM.
 * NEVER includes patient first/last name, CIN, phone, address, or notes.
 * NEVER includes data from a different tenant — runs inside withTenantTx.
 */
export async function buildContext(
  tenantId: string,
  consultationId: string,
): Promise<string> {
  const text = await withTenantTx(tenantId, async (tx) => {
    const [c] = await tx
      .select()
      .from(consultations)
      .where(eq(consultations.id, consultationId));
    if (!c) throw new Error(`Consultation ${consultationId} not found`);

    const [p] = await tx.select().from(patients).where(eq(patients.id, c.patientId));
    if (!p) throw new Error(`Patient ${c.patientId} not found`);

    const allergies = await tx
      .select({ label: patientAllergies.label })
      .from(patientAllergies)
      .where(eq(patientAllergies.patientId, p.id));
    const conditions = await tx
      .select({ label: patientChronicConditions.label })
      .from(patientChronicConditions)
      .where(eq(patientChronicConditions.patientId, p.id));

    const [v] = await tx
      .select()
      .from(consultationVitals)
      .where(eq(consultationVitals.consultationId, consultationId));

    const past = await tx
      .select()
      .from(consultations)
      .where(
        and(eq(consultations.patientId, p.id), eq(consultations.isFinalized, true)),
      )
      .orderBy(desc(consultations.consultedAt))
      .limit(3);

    const recentPresIds = past.length > 0 ? past.map((x) => x.id) : [];
    let presByConsult = new Map<string, string[]>();
    if (recentPresIds.length > 0) {
      const presList = await tx
        .select({
          consultationId: prescriptions.consultationId,
          label: prescriptionItems.medicationLabelSnapshot,
        })
        .from(prescriptions)
        .innerJoin(
          prescriptionItems,
          eq(prescriptionItems.prescriptionId, prescriptions.id),
        );
      presByConsult = new Map();
      for (const row of presList) {
        if (!recentPresIds.includes(row.consultationId)) continue;
        const arr = presByConsult.get(row.consultationId) ?? [];
        arr.push(row.label);
        presByConsult.set(row.consultationId, arr);
      }
    }

    const vitalsLine =
      v &&
      lines(
        v.weightKg ? `poids ${v.weightKg} kg` : null,
        v.heightCm ? `taille ${v.heightCm} cm` : null,
        v.temperatureC ? `temp. ${v.temperatureC} °C` : null,
        v.bpSystolic && v.bpDiastolic ? `TA ${v.bpSystolic}/${v.bpDiastolic}` : null,
        v.heartRate ? `FC ${v.heartRate}` : null,
      ).replace(/\n/g, ' · ');

    return [
      '[Patient]',
      `- Sexe : ${p.gender === 'm' ? 'H' : 'F'} · Âge : ${ageFromDob(p.dateOfBirth)} ans`,
      `- Allergies : ${allergies.length > 0 ? allergies.map((a) => a.label).join(', ') : 'aucune connue'}`,
      `- Antécédents : ${conditions.length > 0 ? conditions.map((x) => x.label).join(', ') : 'aucun connu'}`,
      '',
      '[Consultation en cours]',
      `Motif : ${c.motif ?? '(non renseigné)'}`,
      `Examen : ${c.examNotes ?? '(non renseigné)'}`,
      vitalsLine ? `Constantes : ${vitalsLine}` : 'Constantes : (non renseignées)',
      `Diagnostic provisoire : ${c.diagnosis ?? '(non renseigné)'}`,
      '',
      '[Consultations antérieures (3 dernières finalisées)]',
      past.length === 0
        ? '- aucune'
        : past
            .map((pc) => {
              const meds = (presByConsult.get(pc.id) ?? []).slice(0, 3).join(', ');
              return `- ${fmtDate(pc.consultedAt)} : Diagnostic = ${pc.diagnosis ?? '(non renseigné)'}. Motif = ${pc.motif ?? '—'}.${meds ? ` Ordonnance : ${meds}.` : ''}`;
            })
            .join('\n'),
    ].join('\n');
  });

  // Cheap token estimate: chars / 4. Refuse if context alone exceeds budget.
  const estimated = Math.ceil(text.length / 4);
  if (estimated > MAX_INPUT_TOKEN_BUDGET) {
    throw new ContextTooLargeError(`Estimated ${estimated} tokens > ${MAX_INPUT_TOKEN_BUDGET} budget`);
  }
  return text;
}
