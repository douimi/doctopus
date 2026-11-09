import { z } from 'zod';
import { MESSAGE_MAX_LENGTH } from './types';

export const uuidSchema = z.string().uuid();

export const sendMessageSchema = z.object({
  /** Client-generated id, so the optimistic bubble and the echo dedupe. */
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  body: z
    .string()
    .transform((s) => s.replace(/\r\n/g, '\n').trim())
    .pipe(
      z
        .string()
        .min(1, 'Message vide.')
        .max(MESSAGE_MAX_LENGTH, `Message trop long (${MESSAGE_MAX_LENGTH} caractères max).`),
    ),
});

export type SendMessageInput = z.input<typeof sendMessageSchema>;

export const listMessagesSchema = z.object({
  conversationId: z.string().uuid(),
  before: z.string().datetime({ offset: true }).nullish(),
});

export const sinceSchema = z.string().datetime({ offset: true });
