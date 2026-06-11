import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { patients } from './patients';
import { userProfiles } from './users';

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'restrict' }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  arrivedAt: timestamp('arrived_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  status: text('status', {
    enum: ['scheduled', 'waiting', 'in_consultation', 'done', 'cancelled', 'no_show'],
  }).notNull(),
  kind: text('kind', { enum: ['scheduled', 'walkin'] }).notNull(),
  reason: text('reason'),
  // Optional link to a previous consultation when this appointment is
  // booked as a follow-up. The FK to consultations(id) ON DELETE SET
  // NULL is enforced at the DB level by migration 0015 — we leave the
  // .references() off here to dodge the circular import between this
  // schema and db/schema/consultations.ts.
  parentConsultationId: uuid('parent_consultation_id'),
  createdBy: uuid('created_by').notNull().references(() => userProfiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
