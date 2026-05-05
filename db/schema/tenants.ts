import { boolean, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  prescriptionHeaderHtml: text('prescription_header_html'),
  signatureUrl: text('signature_url'),
  stampUrl: text('stamp_url'),
  rpmNumber: text('rpm_number'),
  cnomNumber: text('cnom_number'),
  status: text('status', { enum: ['active', 'suspended'] }).notNull().default('active'),
  chatbotProvider: text('chatbot_provider', { enum: ['anthropic', 'openai', 'mistral'] }),
  chatbotModel: text('chatbot_model'),
  chatbotEnabled: boolean('chatbot_enabled').notNull().default(false),
  chatbotCreditsBalance: integer('chatbot_credits_balance').notNull().default(0),
  chatbotDisclaimerAcknowledgedAt: timestamp('chatbot_disclaimer_acknowledged_at', { withTimezone: true }),
  defaultConsultationPriceMad: numeric('default_consultation_price_mad', { precision: 10, scale: 2 }),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
