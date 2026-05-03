import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { consultations } from './consultations';

export const consultationChatMessages = pgTable(
  'consultation_chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    consultationId: uuid('consultation_id')
      .notNull()
      .references(() => consultations.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('chat_messages_consultation_idx').on(t.consultationId, t.createdAt)],
);

export const chatbotCreditLedger = pgTable(
  'chatbot_credit_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    change: integer('change').notNull(),
    reason: text('reason', {
      enum: ['grant', 'debit', 'refund', 'admin_adjustment'],
    }).notNull(),
    consultationId: uuid('consultation_id').references(() => consultations.id, {
      onDelete: 'set null',
    }),
    grantedBy: text('granted_by'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('credit_ledger_tenant_idx').on(t.tenantId, t.createdAt)],
);

export const chatbotUsage = pgTable(
  'chatbot_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    consultationId: uuid('consultation_id')
      .notNull()
      .references(() => consultations.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id').references(() => consultationChatMessages.id, {
      onDelete: 'set null',
    }),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    estimatedCostMicrousd: integer('estimated_cost_microusd'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('chat_usage_tenant_created_idx').on(t.tenantId, t.createdAt)],
);

export type ConsultationChatMessage = typeof consultationChatMessages.$inferSelect;
export type NewConsultationChatMessage = typeof consultationChatMessages.$inferInsert;
export type ChatbotCreditLedgerEntry = typeof chatbotCreditLedger.$inferSelect;
export type NewChatbotCreditLedgerEntry = typeof chatbotCreditLedger.$inferInsert;
export type ChatbotUsageRow = typeof chatbotUsage.$inferSelect;
export type NewChatbotUsageRow = typeof chatbotUsage.$inferInsert;
