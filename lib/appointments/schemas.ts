import { z } from 'zod';

export const bookAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  scheduledAt: z.string().datetime({ offset: true }),
  reason: z.string().trim().max(200).optional().or(z.literal('')),
  parentConsultationId: z.string().uuid().optional().nullable(),
});

export const walkInSchema = z.object({
  patientId: z.string().uuid(),
  reason: z.string().trim().max(200).optional().or(z.literal('')),
  parentConsultationId: z.string().uuid().optional().nullable(),
});

export const appointmentIdSchema = z.object({ id: z.string().uuid() });

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;
export type WalkInInput = z.infer<typeof walkInSchema>;
