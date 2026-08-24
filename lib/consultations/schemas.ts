import { z } from 'zod';

const longText = z.string().max(
  10000,
  'trop long (10 000 caractères maximum).',
);

export const sectionsUpdateSchema = z.object({
  motif: longText,
  historyNotes: longText,
  examNotes: longText,
  diagnosis: longText,
  followUpNotes: longText,
});

/**
 * French-locale numeric input from a bare <Input inputMode="decimal">.
 * Accepts "36.5" OR "36,5" — many device keyboards emit a comma by
 * default in French locales and we don't want to reject those with an
 * unhelpful "Données invalides" error. The transform normalizes to the
 * canonical "36.5" so downstream code (and Postgres numeric) never
 * sees a comma.
 */
const numericStr = (opts: { min?: number; max?: number; allowDecimal?: boolean } = {}) => {
  const pattern = opts.allowDecimal !== false ? /^\d+([.,]\d+)?$/ : /^\d+$/;
  return z
    .string()
    .transform((v) => (opts.allowDecimal !== false ? v.replace(',', '.') : v))
    .refine((v) => v === '' || pattern.test(v), 'doit être un nombre.')
    .refine(
      (v) => v === '' || opts.min === undefined || Number(v) >= opts.min,
      opts.min === undefined
        ? 'valeur invalide.'
        : `doit être supérieur ou égal à ${opts.min}.`,
    )
    .refine(
      (v) => v === '' || opts.max === undefined || Number(v) <= opts.max,
      opts.max === undefined
        ? 'valeur invalide.'
        : `doit être inférieur ou égal à ${opts.max}.`,
    );
};

export const vitalsUpdateSchema = z.object({
  weightKg: numericStr({ min: 0, max: 999.99 }),
  heightCm: numericStr({ min: 0, max: 299.9 }),
  temperatureC: numericStr({ min: 25, max: 45 }),
  bpSystolic: numericStr({ min: 0, max: 350, allowDecimal: false }),
  bpDiastolic: numericStr({ min: 0, max: 250, allowDecimal: false }),
  heartRate: numericStr({ min: 0, max: 300, allowDecimal: false }),
  notes: z.string().max(2000, 'trop long (2 000 caractères maximum).'),
});

export type SectionsUpdateInput = z.infer<typeof sectionsUpdateSchema>;
export type VitalsUpdateInput = z.infer<typeof vitalsUpdateSchema>;
