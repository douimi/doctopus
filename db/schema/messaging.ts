import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { userProfiles } from './users';
import { patients } from './patients';
import { appointments } from './appointments';

/**
 * Cabinet messaging (migration 0020). RLS + realtime fan-out triggers live
 * in SQL; see supabase/migrations/0020_cabinet_messaging.sql.
 */
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    kind: text('kind', { enum: ['cabinet', 'direct'] }).notNull(),
    // Direct threads only, ordered so user_a < user_b.
    userA: uuid('user_a').references(() => userProfiles.id, { onDelete: 'restrict' }),
    userB: uuid('user_b').references(() => userProfiles.id, { onDelete: 'restrict' }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('conversations_one_cabinet_per_tenant')
      .on(t.tenantId)
      .where(sql`${t.kind} = 'cabinet'`),
    uniqueIndex('conversations_direct_pair_unique')
      .on(t.tenantId, t.userA, t.userB)
      .where(sql`${t.kind} = 'direct'`),
  ],
);

export const conversationMembers = pgTable(
  'conversation_members',
  {
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => userProfiles.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    muted: boolean('muted').notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.userId] }),
    index('conversation_members_user_idx').on(t.userId),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => userProfiles.id, { onDelete: 'restrict' }),
    kind: text('kind', { enum: ['text', 'quick', 'attachment', 'voice'] })
      .notNull()
      .default('text'),
    body: text('body'),
    patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null' }),
    appointmentId: uuid('appointment_id').references(() => appointments.id, {
      onDelete: 'set null',
    }),
    attachmentPath: text('attachment_path'),
    attachmentName: text('attachment_name'),
    attachmentMime: text('attachment_mime'),
    attachmentBytes: integer('attachment_bytes'),
    voiceDurationMs: integer('voice_duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('messages_conversation_created_idx').on(t.conversationId, t.createdAt.desc()),
    index('messages_tenant_created_idx').on(t.tenantId, t.createdAt),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type ConversationMember = typeof conversationMembers.$inferSelect;
export type Message = typeof messages.$inferSelect;
