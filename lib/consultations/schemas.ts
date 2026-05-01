import { z } from 'zod';

const longText = z.string().max(10000);

export const sectionsUpdateSchema = z.object({
  motif: longText,
  historyNotes: longText,
  examNotes: longText,
  diagnosis: longText,
  followUpNotes: longText,
});

const numericStr = (opts: { min?: number; max?: number; allowDecimal?: boolean } = {}) =>
  z
    .string()
    .refine(
      (v) => v === '' || (opts.allowDecimal !== false ? /^\d+(\.\d+)?$/ : /^\d+$/).test(v),
      'Doit être un nombre',
    )
    .refine(
      (v) => v === '' || opts.min === undefined || Number(v) >= opts.min,
      `Doit être >= ${opts.min ?? 0}`,
    )
    .refine(
      (v) => v === '' || opts.max === undefined || Number(v) <= opts.max,
      `Doit être <= ${opts.max ?? Infinity}`,
    );

export const vitalsUpdateSchema = z.object({
  weightKg: numericStr({ min: 0, max: 999.99 }),
  heightCm: numericStr({ min: 0, max: 299.9 }),
  temperatureC: numericStr({ min: 25, max: 45 }),
  bpSystolic: numericStr({ min: 0, max: 350, allowDecimal: false }),
  bpDiastolic: numericStr({ min: 0, max: 250, allowDecimal: false }),
  heartRate: numericStr({ min: 0, max: 300, allowDecimal: false }),
  notes: z.string().max(2000),
});

export type SectionsUpdateInput = z.infer<typeof sectionsUpdateSchema>;
export type VitalsUpdateInput = z.infer<typeof vitalsUpdateSchema>;
