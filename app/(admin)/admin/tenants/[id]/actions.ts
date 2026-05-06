'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/admin';
import { recordAudit } from '@/lib/audit/record';
import { grantCredits, setCredits } from '@/lib/chatbot/credits';
import {
  EncryptionKeyMissingError,
  clearTenantApiKey,
  setTenantApiKey,
} from '@/lib/chatbot/byo-key';
import { dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';
import { ALLOWED_MODELS_BY_PROVIDER } from '@/lib/chatbot/pricing';

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

const setModelSchema = tenantIdSchema.extend({
  provider: z.enum(['anthropic', 'openai', 'mistral']),
  model: z.string().min(1),
});

export type SetModelState = { error: string | null; ok: boolean };

export async function adminSetModelAction(
  _: SetModelState,
  formData: FormData,
): Promise<SetModelState> {
  const session = await requireAdmin();
  const parsed = setModelSchema.safeParse({
    tenantId: formData.get('tenantId'),
    provider: formData.get('provider'),
    model: formData.get('model'),
  });
  if (!parsed.success) return { error: 'Champs invalides.', ok: false };

  if (!ALLOWED_MODELS_BY_PROVIDER[parsed.data.provider].includes(parsed.data.model)) {
    return {
      error: `Modèle non autorisé pour ${parsed.data.provider}. Autorisés: ${ALLOWED_MODELS_BY_PROVIDER[parsed.data.provider].join(', ')}.`,
      ok: false,
    };
  }

  const [before] = await dbAdmin().select().from(tenants).where(eq(tenants.id, parsed.data.tenantId));
  if (!before) return { error: 'Cabinet introuvable.', ok: false };

  await dbAdmin()
    .update(tenants)
    .set({
      chatbotProvider: parsed.data.provider,
      chatbotModel: parsed.data.model,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, parsed.data.tenantId));

  await recordAudit({
    tenantId: parsed.data.tenantId,
    actorUserId: session.userId,
    action: 'admin.tenant.set_model',
    entityType: 'tenant',
    entityId: parsed.data.tenantId,
    metadata: {
      from: { provider: before.chatbotProvider, model: before.chatbotModel },
      to: { provider: parsed.data.provider, model: parsed.data.model },
    },
  });

  revalidatePath(`/admin/tenants/${parsed.data.tenantId}`);
  return { error: null, ok: true };
}

const toggleSchema = tenantIdSchema.extend({
  desired: z.enum(['enable', 'disable']),
});

export async function adminToggleChatbotAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const parsed = toggleSchema.safeParse({
    tenantId: formData.get('tenantId'),
    desired: formData.get('desired'),
  });
  if (!parsed.success) return;

  const next = parsed.data.desired === 'enable';
  await dbAdmin()
    .update(tenants)
    .set({ chatbotEnabled: next, updatedAt: new Date() })
    .where(eq(tenants.id, parsed.data.tenantId));

  await recordAudit({
    tenantId: parsed.data.tenantId,
    actorUserId: session.userId,
    action: next ? 'admin.tenant.enable_chatbot' : 'admin.tenant.disable_chatbot',
    entityType: 'tenant',
    entityId: parsed.data.tenantId,
  });

  revalidatePath(`/admin/tenants/${parsed.data.tenantId}`);
}

const suspensionSchema = tenantIdSchema.extend({
  desired: z.enum(['suspend', 'reactivate']),
});

export async function adminToggleSuspensionAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const parsed = suspensionSchema.safeParse({
    tenantId: formData.get('tenantId'),
    desired: formData.get('desired'),
  });
  if (!parsed.success) return;

  const nextStatus = parsed.data.desired === 'suspend' ? 'suspended' : 'active';
  await dbAdmin()
    .update(tenants)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(tenants.id, parsed.data.tenantId));

  await recordAudit({
    tenantId: parsed.data.tenantId,
    actorUserId: session.userId,
    action: parsed.data.desired === 'suspend' ? 'admin.tenant.suspend' : 'admin.tenant.reactivate',
    entityType: 'tenant',
    entityId: parsed.data.tenantId,
  });

  revalidatePath(`/admin/tenants/${parsed.data.tenantId}`);
  revalidatePath('/admin/tenants');
}

const setKeySchema = tenantIdSchema.extend({
  apiKey: z.string().trim().min(8).max(2000),
});

export type SetApiKeyState = { error: string | null; ok: boolean };

export async function adminSetApiKeyAction(
  _: SetApiKeyState,
  formData: FormData,
): Promise<SetApiKeyState> {
  const session = await requireAdmin();
  const parsed = setKeySchema.safeParse({
    tenantId: formData.get('tenantId'),
    apiKey: formData.get('apiKey'),
  });
  if (!parsed.success) {
    return { error: 'Clé invalide (min. 8 caractères).', ok: false };
  }

  try {
    await setTenantApiKey(parsed.data.tenantId, parsed.data.apiKey);
  } catch (err) {
    if (err instanceof EncryptionKeyMissingError) {
      return {
        error:
          "CHATBOT_KEY_ENCRYPTION_KEY n'est pas configurée côté serveur. Définissez-la pour activer les clés API par cabinet.",
        ok: false,
      };
    }
    throw err;
  }

  await recordAudit({
    tenantId: parsed.data.tenantId,
    actorUserId: session.userId,
    action: 'admin.tenant.api_key_set',
    entityType: 'tenant',
    entityId: parsed.data.tenantId,
    metadata: { last4: parsed.data.apiKey.slice(-4) },
  });

  revalidatePath(`/admin/tenants/${parsed.data.tenantId}`);
  return { error: null, ok: true };
}

const setCreditsSchema = tenantIdSchema.extend({
  newBalance: z.coerce.number().int().min(0).max(100_000),
  note: z.string().trim().max(200).optional().or(z.literal('')),
});

export type SetCreditsState = {
  error: string | null;
  ok: boolean;
  newBalance: number | null;
};

export async function adminSetCreditsAction(
  _: SetCreditsState,
  formData: FormData,
): Promise<SetCreditsState> {
  const session = await requireAdmin();
  const parsed = setCreditsSchema.safeParse({
    tenantId: formData.get('tenantId'),
    newBalance: formData.get('newBalance'),
    note: formData.get('note'),
  });
  if (!parsed.success) {
    return { error: 'Solde invalide (entier ≥ 0).', ok: false, newBalance: null };
  }

  const result = await setCredits(
    parsed.data.tenantId,
    parsed.data.newBalance,
    `admin:${session.email}`,
    parsed.data.note || undefined,
  );

  await recordAudit({
    tenantId: parsed.data.tenantId,
    actorUserId: session.userId,
    action: 'admin.tenant.set_credits',
    entityType: 'tenant',
    entityId: parsed.data.tenantId,
    metadata: {
      previous: result.previousBalance,
      next: result.newBalance,
      delta: result.delta,
      note: parsed.data.note || null,
    },
  });

  revalidatePath(`/admin/tenants/${parsed.data.tenantId}`);
  revalidatePath('/admin');
  revalidatePath('/admin/tenants');
  return { error: null, ok: true, newBalance: result.newBalance };
}

export async function adminClearApiKeyAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const parsed = tenantIdSchema.safeParse({ tenantId: formData.get('tenantId') });
  if (!parsed.success) return;

  await clearTenantApiKey(parsed.data.tenantId);

  await recordAudit({
    tenantId: parsed.data.tenantId,
    actorUserId: session.userId,
    action: 'admin.tenant.api_key_cleared',
    entityType: 'tenant',
    entityId: parsed.data.tenantId,
  });

  revalidatePath(`/admin/tenants/${parsed.data.tenantId}`);
}

// Patient bulk import is handled via /api/admin/patient-import (XHR upload
// with progress + downloadable failed-rows CSV). See ImportPatientsCard.
