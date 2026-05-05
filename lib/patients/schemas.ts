import { z } from 'zod';
import { COVERAGE_VALUES } from './coverage';

const cinRegex = /^[A-Z]{1,2}[0-9]{1,8}$/i;
const COVERAGE_VALUE_SET = new Set(COVERAGE_VALUES);

export const patientCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  gender: z.enum(['m', 'f']),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  phone: z.string().trim().min(1).max(40),
  cin: z.string().trim().regex(cinRegex, 'CIN invalide').optional().or(z.literal('')),
  coverageType: z
    .string()
    .refine((v) => v === '' || COVERAGE_VALUE_SET.has(v), {
      message: 'Type de couverture invalide.',
    })
    .optional()
    .or(z.literal('')),
  coverageId: z.string().trim().max(80).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

export const patientUpdateSchema = patientCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const labelSchema = z.object({
  patientId: z.string().uuid(),
  label: z.string().trim().min(1).max(120),
});

export const removeLabelSchema = z.object({
  id: z.string().uuid(),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;
