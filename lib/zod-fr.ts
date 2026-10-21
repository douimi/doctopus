import type { ZodError } from 'zod';

/**
 * Turns a Zod validation error into a single French sentence the doctor
 * can act on ("Poids : doit être un nombre" instead of the useless
 * "Données invalides."). Falls back to the first raw issue message when
 * the field isn't in `labels`, and to a generic sentence when the error
 * has no issues.
 */
export function firstIssueFr(
  error: ZodError,
  labels: Record<string, string> = {},
): string {
  const issue = error.issues[0];
  if (!issue) return 'Données invalides.';
  const field = issue.path[0];
  const label = typeof field === 'string' ? labels[field] : undefined;
  return label ? `${label} : ${issue.message}` : issue.message;
}

export const CONSULTATION_SECTION_LABELS: Record<string, string> = {
  motif: 'Motif',
  historyNotes: 'Histoire de la maladie',
  examNotes: 'Examen clinique',
  diagnosis: 'Diagnostic',
  followUpNotes: 'Suite / follow-up',
};

export const PATIENT_HISTORY_LABELS: Record<string, string> = {
  historyMedical: 'Antécédents médicaux',
  historySurgical: 'Antécédents chirurgicaux',
  historyFamily: 'Antécédents familiaux',
  historyTreatments: 'Traitements en cours',
  historyLifestyle: 'Habitudes de vie',
};

export const CONSULTATION_VITALS_LABELS: Record<string, string> = {
  weightKg: 'Poids',
  heightCm: 'Taille',
  temperatureC: 'Température',
  bpSystolic: 'Tension systolique',
  bpDiastolic: 'Tension diastolique',
  heartRate: 'Fréquence cardiaque',
  notes: 'Notes',
};
