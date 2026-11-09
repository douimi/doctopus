import { z } from 'zod';
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIMES,
  AUDIO_MIMES,
  MESSAGE_MAX_LENGTH,
  VOICE_MAX_MS,
  baseMime,
} from './types';

export const uuidSchema = z.string().uuid();

const bodySchema = z
  .string()
  .transform((s) => s.replace(/\r\n/g, '\n').trim())
  .pipe(z.string().max(MESSAGE_MAX_LENGTH, `Message trop long (${MESSAGE_MAX_LENGTH} caractères max).`));

const mimeSchema = z
  .string()
  .transform(baseMime)
  .refine((m) => ATTACHMENT_MIMES.includes(m), 'Format de fichier non pris en charge.');

export const attachmentSchema = z.object({
  path: z.string().min(1).max(300),
  name: z
    .string()
    .transform((s) => s.trim().slice(0, 120))
    .pipe(z.string().min(1)),
  mime: mimeSchema,
  bytes: z.number().int().positive().max(ATTACHMENT_MAX_BYTES, 'Fichier trop volumineux (10 Mo max).'),
});

/**
 * One schema for every message kind:
 *  - text: body and/or a patient link
 *  - quick: one-tap reply (body required)
 *  - attachment: photo / PDF (+ optional caption and patient)
 *  - voice: audio attachment + duration
 */
export const sendMessageSchema = z
  .object({
    /** Client-generated id, so the optimistic bubble and the echo dedupe. */
    id: z.string().uuid(),
    conversationId: z.string().uuid(),
    kind: z.enum(['text', 'quick', 'attachment', 'voice']).default('text'),
    body: bodySchema.nullish().transform((b) => (b ? b : null)),
    patientId: z.string().uuid().nullish().transform((v) => v ?? null),
    attachment: attachmentSchema.nullish().transform((v) => v ?? null),
    voiceDurationMs: z
      .number()
      .int()
      .positive()
      .max(VOICE_MAX_MS + 5_000)
      .nullish()
      .transform((v) => v ?? null),
  })
  .superRefine((m, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    switch (m.kind) {
      case 'text':
        if (!m.body && !m.patientId) fail('Message vide.');
        if (m.attachment) fail('Pièce jointe inattendue.');
        break;
      case 'quick':
        if (!m.body) fail('Message vide.');
        if (m.attachment) fail('Pièce jointe inattendue.');
        break;
      case 'attachment':
        if (!m.attachment) fail('Pièce jointe manquante.');
        else if ((AUDIO_MIMES as readonly string[]).includes(m.attachment.mime)) {
          fail('Utilisez une note vocale pour l’audio.');
        }
        break;
      case 'voice':
        if (!m.attachment || !(AUDIO_MIMES as readonly string[]).includes(m.attachment.mime)) {
          fail('Note vocale invalide.');
        }
        if (!m.voiceDurationMs) fail('Durée de la note vocale manquante.');
        break;
    }
  });

export type SendMessageInput = z.input<typeof sendMessageSchema>;

export const uploadRequestSchema = z.object({
  conversationId: z.string().uuid(),
  mime: mimeSchema,
  bytes: z.number().int().positive().max(ATTACHMENT_MAX_BYTES, 'Fichier trop volumineux (10 Mo max).'),
});

export const quickRepliesSchema = z
  .array(
    z.object({
      label: z
        .string()
        .transform((s) => s.trim())
        .pipe(z.string().min(1, 'Libellé requis.').max(32, 'Libellé : 32 caractères max.')),
      body: z
        .string()
        .transform((s) => s.trim())
        .pipe(z.string().min(1, 'Message requis.').max(280, 'Message : 280 caractères max.')),
    }),
  )
  .max(20, '20 messages rapides maximum.');

export const listMessagesSchema = z.object({
  conversationId: z.string().uuid(),
  before: z.string().datetime({ offset: true }).nullish(),
});

export const sinceSchema = z.string().datetime({ offset: true });
