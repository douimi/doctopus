'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { recordPaymentSchema } from '@/lib/payments/schemas';
import { recordPayment } from '@/lib/payments/mutations';
import { recordAudit } from '@/lib/audit/record';

export type RecordPaymentResult = { ok: boolean; error?: string };

export async function recordPaymentAction(formData: FormData): Promise<RecordPaymentResult> {
  // Both doctor and assistant can collect payments. requireSession only
  // returns a Session for the two clinician roles — super-admins live on
  // a different route tree and don't reach this action.
  const session = await requireSession();
  const parsed = recordPaymentSchema.safeParse({
    consultationId: formData.get('consultationId'),
    paymentMethod: formData.get('paymentMethod'),
    paymentNote: formData.get('paymentNote') ?? null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
  }

  const outcome = await recordPayment(session.tenantId, {
    consultationId: parsed.data.consultationId,
    paymentMethod: parsed.data.paymentMethod,
    paymentNote: parsed.data.paymentNote ?? null,
    recordedBy: session.userId,
  });
  if (outcome === 'not_found') {
    return { ok: false, error: 'Consultation introuvable.' };
  }
  if (outcome === 'not_awaiting') {
    return { ok: false, error: 'Consultation déjà encaissée ou non payable.' };
  }

  await recordAudit({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    action: 'consultation.payment_received',
    entityType: 'consultation',
    entityId: parsed.data.consultationId,
    metadata: {
      paymentMethod: parsed.data.paymentMethod,
      hasNote: !!(parsed.data.paymentNote && parsed.data.paymentNote.trim().length > 0),
    },
  });

  revalidatePath('/today');
  revalidatePath('/stats');
  return { ok: true };
}
