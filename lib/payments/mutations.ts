import 'server-only';
import { and, eq } from 'drizzle-orm';
import { withTenantTx } from '@/db/with-tenant';
import { consultations } from '@/db/schema';
import type { PaymentMethod } from './schemas';

export type RecordPaymentOutcome = 'ok' | 'not_found' | 'not_awaiting';

export type RecordPaymentArgs = {
  consultationId: string;
  paymentMethod: PaymentMethod;
  paymentNote: string | null;
  assistantId: string;
};

/**
 * Transition an awaiting consultation to paid. Atomic: uses a guarded
 * UPDATE that only succeeds while payment_status='awaiting', so two
 * concurrent encaisser actions cannot both succeed.
 *
 * Returns:
 *   - 'ok'           — transitioned to paid; method/recorder/timestamp set.
 *   - 'not_found'    — consultation doesn't exist in this tenant.
 *   - 'not_awaiting' — consultation exists but is already paid, free, or
 *                      otherwise not in the awaiting state. Either a race
 *                      (double-click), or an attempt to encaisser something
 *                      that shouldn't be encaissed.
 */
export async function recordPayment(
  tenantId: string,
  args: RecordPaymentArgs,
): Promise<RecordPaymentOutcome> {
  return withTenantTx(tenantId, async (tx) => {
    // Pre-check for clearer 'not_found' vs 'not_awaiting' attribution.
    const [c] = await tx
      .select({ id: consultations.id, paymentStatus: consultations.paymentStatus })
      .from(consultations)
      .where(and(eq(consultations.id, args.consultationId), eq(consultations.tenantId, tenantId)));
    if (!c) return 'not_found';
    if (c.paymentStatus !== 'awaiting') return 'not_awaiting';

    const now = new Date();
    // Guarded UPDATE — only succeeds if status is still 'awaiting'.
    const updated = await tx
      .update(consultations)
      .set({
        paymentStatus: 'paid',
        paymentMethod: args.paymentMethod,
        paidAt: now,
        paidBy: args.assistantId,
        paymentNote: args.paymentNote,
        updatedAt: now,
      })
      .where(
        and(
          eq(consultations.id, args.consultationId),
          eq(consultations.tenantId, tenantId),
          eq(consultations.paymentStatus, 'awaiting'),
        ),
      )
      .returning({ id: consultations.id });

    return updated.length > 0 ? 'ok' : 'not_awaiting';
  });
}
