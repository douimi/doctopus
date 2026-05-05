import { z } from 'zod';

export const finalizePricingSchema = z
  .object({
    consultationId: z.string().uuid(),
    isFree: z.boolean(),
    priceMad: z.string().optional(),
  })
  .refine(
    (d) => d.isFree || (d.priceMad != null && d.priceMad !== '' && Number.isFinite(Number(d.priceMad)) && Number(d.priceMad) > 0),
    { message: 'Prix requis (ou cocher Gratuit).' },
  );

export type FinalizePricingInput = z.infer<typeof finalizePricingSchema>;

export const PAYMENT_METHODS = ['especes', 'carte', 'cheque', 'virement', 'autre'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const recordPaymentSchema = z
  .object({
    consultationId: z.string().uuid(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    paymentNote: z.string().nullable().optional(),
  })
  .refine(
    (d) => d.paymentMethod !== 'autre' || (typeof d.paymentNote === 'string' && d.paymentNote.trim().length > 0),
    { message: 'Une note est requise quand la méthode est "Autre".' },
  );

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
