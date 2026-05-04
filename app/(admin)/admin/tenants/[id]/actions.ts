'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { recordAudit } from '@/lib/audit/record';
import { grantCredits } from '@/lib/chatbot/credits';

const tenantIdSchema = z.object({ tenantId: z.string().uuid() });

const grantSchema = tenantIdSchema.extend({
  consultations: z.coerce.number().int().positive().max(10_000),
  note: z.string().trim().max(200).optional().or(z.literal('')),
});

export type GrantState = { error: string | null; ok: boolean };

export async function adminGrantCreditsAction(
  _: GrantState,
  formData: FormData,
): Promise<GrantState> {
  const session = await requireAdmin();
  const parsed = grantSchema.safeParse({
    tenantId: formData.get('tenantId'),
    consultations: formData.get('consultations'),
    note: formData.get('note'),
  });
  if (!parsed.success) return { error: 'Champs invalides.', ok: false };

  await grantCredits(parsed.data.tenantId, parsed.data.consultations, `admin:${session.email}`, parsed.data.note || undefined);

  await recordAudit({
    tenantId: parsed.data.tenantId,
    actorUserId: session.userId,
    action: 'admin.tenant.grant_credits',
    entityType: 'tenant',
    entityId: parsed.data.tenantId,
    metadata: { consultations: parsed.data.consultations, note: parsed.data.note || null },
  });

  revalidatePath(`/admin/tenants/${parsed.data.tenantId}`);
  revalidatePath('/admin');
  revalidatePath('/admin/tenants');
  return { error: null, ok: true };
}
