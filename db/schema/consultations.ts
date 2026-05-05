import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { patients } from './patients';
import { userProfiles } from './users';
import { appointments } from './appointments';

export const consultations = pgTable(
  'consultations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'restrict' }),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'restrict' }),
    doctorId: uuid('doctor_id').notNull().references(() => userProfiles.id),
    consultedAt: timestamp('consulted_at', { withTimezone: true }).notNull().defaultNow(),
    motif: text('motif'),
    historyNotes: text('history_notes'),
    examNotes: text('exam_notes'),
    diagnosis: text('diagnosis'),
    followUpNotes: text('follow_up_notes'),
    isFinalized: boolean('is_finalized').notNull().default(false),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    aiCreditConsumedAt: timestamp('ai_credit_consumed_at', { withTimezone: true }),
    priceMad: numeric('price_mad', { precision: 10, scale: 2 }),
    isFree: boolean('is_free').notNull().default(false),
    paymentStatus: text('payment_status', { enum: ['awaiting', 'paid', 'free'] })
      .notNull()
      .default('awaiting'),
    paymentMethod: text('payment_method', {
      enum: ['especes', 'carte', 'cheque', 'virement', 'autre'],
    }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    paidBy: uuid('paid_by').references(() => userProfiles.id),
    paymentNote: text('payment_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('consultations_one_per_appointment').on(t.appointmentId)],
);

export const consultationVitals = pgTable(
  'consultation_vitals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    consultationId: uuid('consultation_id')
      .notNull()
      .references(() => consultations.id, { onDelete: 'cascade' }),
    weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
    heightCm: numeric('height_cm', { precision: 5, scale: 1 }),
    temperatureC: numeric('temperature_c', { precision: 4, scale: 1 }),
    bpSystolic: integer('bp_systolic'),
    bpDiastolic: integer('bp_diastolic'),
    heartRate: integer('heart_rate'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('consultation_vitals_one_per_consultation').on(t.consultationId)],
);

export type Consultation = typeof consultations.$inferSelect;
export type NewConsultation = typeof consultations.$inferInsert;
export type ConsultationVitals = typeof consultationVitals.$inferSelect;
export type NewConsultationVitals = typeof consultationVitals.$inferInsert;
