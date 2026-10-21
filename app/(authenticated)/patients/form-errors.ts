import type { ZodError } from 'zod';
import type { $ZodRawIssue } from 'zod/v4/core';
import { firstIssueFr } from '@/lib/zod-fr';

/** Field labels used in error sentences ("Nom : champ obligatoire."). */
export const PATIENT_FIELD_LABELS: Record<string, string> = {
  lastName: 'Nom',
  firstName: 'Prénom',
  gender: 'Sexe',
  dateOfBirth: 'Date de naissance',
  phone: 'Téléphone',
  cin: 'CIN',
  coverageType: 'Couverture',
  coverageId: "N° d'assuré",
  address: 'Adresse',
  notes: 'Notes',
};

/**
 * Per-parse zod error map producing short French messages. Schema-level
 * custom messages ("CIN invalide") still win — zod only consults this map
 * for issues without one. Pass it as `schema.safeParse(data, { error: frenchIssue })`.
 */
export function frenchIssue(iss: $ZodRawIssue): string {
  const input = (iss as { input?: unknown }).input;
  if (input === undefined || input === null || input === '') return 'champ obligatoire.';
  switch (iss.code) {
    case 'too_small': {
      const min = Number((iss as { minimum?: number | bigint }).minimum ?? 0);
      return min <= 1 ? 'champ obligatoire.' : `au moins ${min} caractères.`;
    }
    case 'too_big': {
      const max = Number((iss as { maximum?: number | bigint }).maximum ?? 0);
      return `${max} caractères maximum.`;
    }
    case 'invalid_value':
      return 'valeur non reconnue.';
    case 'invalid_format':
      return 'format invalide.';
    case 'invalid_type':
      return 'valeur invalide.';
    default:
      return 'valeur invalide.';
  }
}

export type FieldErrors = Record<string, string>;

/** One French message per field (first issue wins), keyed by top-level field name. */
export function fieldErrorsFr(error: ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== 'string' || out[key]) continue;
    out[key] = capitalize(issue.message);
  }
  return out;
}

/** Summary sentence for the form-level Alert. */
export function summaryFr(error: ZodError): string {
  const count = new Set(error.issues.map((i) => String(i.path[0] ?? ''))).size;
  const first = firstIssueFr(error, PATIENT_FIELD_LABELS);
  return count > 1 ? `${first} (et ${count - 1} autre${count > 2 ? 's' : ''} champ${count > 2 ? 's' : ''} à corriger)` : first;
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/** Keeps only string entries of a FormData, so they can be echoed back into the form. */
export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === 'string' && !k.startsWith('$ACTION')) out[k] = v;
  }
  return out;
}
