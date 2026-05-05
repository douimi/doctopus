import { describe, expect, it } from 'vitest';
import { finalizePricingSchema, recordPaymentSchema } from '@/lib/payments/schemas';

describe('finalizePricingSchema', () => {
  const okId = '11111111-1111-4111-8111-111111111111';

  it('accepts a positive price with isFree=false', () => {
    const r = finalizePricingSchema.safeParse({
      consultationId: okId,
      isFree: false,
      priceMad: '250.00',
    });
    expect(r.success).toBe(true);
  });

  it('accepts isFree=true with no price', () => {
    const r = finalizePricingSchema.safeParse({
      consultationId: okId,
      isFree: true,
    });
    expect(r.success).toBe(true);
  });

  it('rejects neither price nor free', () => {
    const r = finalizePricingSchema.safeParse({
      consultationId: okId,
      isFree: false,
    });
    expect(r.success).toBe(false);
  });

  it('rejects price <= 0 when not free', () => {
    const r = finalizePricingSchema.safeParse({
      consultationId: okId,
      isFree: false,
      priceMad: '0',
    });
    expect(r.success).toBe(false);
  });

  it('rejects non-numeric price', () => {
    const r = finalizePricingSchema.safeParse({
      consultationId: okId,
      isFree: false,
      priceMad: 'abc',
    });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid uuid', () => {
    const r = finalizePricingSchema.safeParse({
      consultationId: 'not-a-uuid',
      isFree: true,
    });
    expect(r.success).toBe(false);
  });
});

describe('recordPaymentSchema', () => {
  const okId = '11111111-1111-4111-8111-111111111111';

  it('accepts especes with no note', () => {
    const r = recordPaymentSchema.safeParse({
      consultationId: okId,
      paymentMethod: 'especes',
    });
    expect(r.success).toBe(true);
  });

  it('accepts carte / cheque / virement / autre with note for autre', () => {
    for (const m of ['carte', 'cheque', 'virement'] as const) {
      const r = recordPaymentSchema.safeParse({
        consultationId: okId,
        paymentMethod: m,
      });
      expect(r.success).toBe(true);
    }
    const a = recordPaymentSchema.safeParse({
      consultationId: okId,
      paymentMethod: 'autre',
      paymentNote: 'split: 100 espèces + 150 carte',
    });
    expect(a.success).toBe(true);
  });

  it('rejects autre without a note', () => {
    const r = recordPaymentSchema.safeParse({
      consultationId: okId,
      paymentMethod: 'autre',
    });
    expect(r.success).toBe(false);
  });

  it('rejects autre with empty / whitespace note', () => {
    const r = recordPaymentSchema.safeParse({
      consultationId: okId,
      paymentMethod: 'autre',
      paymentNote: '   ',
    });
    expect(r.success).toBe(false);
  });

  it('rejects unknown paymentMethod', () => {
    const r = recordPaymentSchema.safeParse({
      consultationId: okId,
      paymentMethod: 'crypto',
    });
    expect(r.success).toBe(false);
  });
});
