import { boolean, date, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  gender: text('gender', { enum: ['m', 'f'] }).notNull(),
  dateOfBirth: date('date_of_birth'),
  phone: text('phone'),
  cin: text('cin'),
  // Free-form text — validated at the Zod layer against COVERAGE_VALUES so
  // we can grow the list (mutuelles, private insurers) without a migration.
  coverageType: text('coverage_type'),
  coverageId: text('coverage_id'),
  address: text('address'),
  notes: text('notes'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const patientAllergies = pgTable('patient_allergies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const patientChronicConditions = pgTable('patient_chronic_conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type PatientAllergy = typeof patientAllergies.$inferSelect;
export type PatientChronicCondition = typeof patientChronicConditions.$inferSelect;
