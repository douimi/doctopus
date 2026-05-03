import {
  boolean,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const medications = pgTable('medications', {
  id: uuid('id').primaryKey().defaultRandom(),
  dmpCode: text('dmp_code'),
  nomCommercial: text('nom_commercial').notNull(),
  dci: text('dci').notNull(),
  dosage: text('dosage'),
  forme: text('forme'),
  presentation: text('presentation'),
  classeTherapeutique: text('classe_therapeutique'),
  laboratoire: text('laboratoire'),
  ppv: numeric('ppv', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').notNull().default(true),
  importBatchId: uuid('import_batch_id'),
  importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb('metadata'),
});

export const medicationImports = pgTable('medication_imports', {
  id: uuid('id').primaryKey().defaultRandom(),
  importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
  importedBy: text('imported_by'),
  sourceFileName: text('source_file_name'),
  rowCountInserted: numeric('row_count_inserted'),
  rowCountUpdated: numeric('row_count_updated'),
  rowCountDeactivated: numeric('row_count_deactivated'),
  rowCountSkipped: numeric('row_count_skipped'),
  notes: text('notes'),
});

export type Medication = typeof medications.$inferSelect;
export type NewMedication = typeof medications.$inferInsert;
export type MedicationImport = typeof medicationImports.$inferSelect;
