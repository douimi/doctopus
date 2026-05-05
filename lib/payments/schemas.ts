import { z } from 'zod';

export const finalizePricingSchema = z
  .object({
    consultationId: z.string().uuid(),
    isFree: z.boolean(),
    priceMad: z.string().optional(),
  })
  .refine(
    (d) => d.isFree || (d.priceMad != null && d.priceMad !== ''),
    { message: 'Prix requis (ou cocher Gratuit).', path: ['priceMad'] },
  )
  .refine(
    (d) => d.isFree || d.priceMad == null || d.priceMad === '' || Number.isFinite(Number(d.priceMad)),
    { message: 'Le prix doit être un nombre.', path: ['priceMad'] },
  )
  .refine(
    (d) => d.isFree || d.priceMad == null || d.priceMad === '' || Number(d.priceMad) > 0,
    { message: 'Le prix doit être supérieur à 0.', path: ['priceMad'] },
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

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  especes: 'Espèces',
  carte: 'Carte',
  cheque: 'Chèque',
  virement: 'Virement',
  autre: 'Autre',
};
