'use server';

import { redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { dbAdmin } from '@/db/client';
import { tenants, tenantInvites, userProfiles } from '@/db/schema';
import { hashInviteToken } from '@/lib/invites/tokens';
import { lookupInvite } from '@/lib/invites/lookup';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { recordAudit } from '@/lib/audit/record';
import { firstIssueFr } from '@/lib/zod-fr';

const fullName = z
  .string()
  .trim()
  .min(2, 'au moins 2 caractères.')
  .max(120, '120 caractères maximum.');
const email = z.string().trim().email('adresse email invalide.');
const password = z
  .string()
  .min(12, 'au moins 12 caractères.')
  .max(200, '200 caractères maximum.');
const token = z.string().regex(/^[0-9a-f]{64}$/, "lien d'invitation invalide.");

const ownerSchema = z.object({
  token,
  fullName,
  cabinetName: z
    .string()
    .trim()
    .min(2, 'au moins 2 caractères.')
    .max(160, '160 caractères maximum.'),
  cabinetAddress: z.string().trim().max(300, '300 caractères maximum.').optional().or(z.literal('')),
  cabinetPhone: z.string().trim().max(40, '40 caractères maximum.').optional().or(z.literal('')),
  email,
  password,
});

const assistantSchema = z.object({
  token,
  fullName,
  email,
  password,
});

const FIELD_LABELS: Record<string, string> = {
  token: 'Invitation',
  fullName: 'Nom complet',
  cabinetName: 'Nom du cabinet',
  cabinetAddress: 'Adresse',
  cabinetPhone: 'Téléphone',
  email: 'Email',
  password: 'Mot de passe',
};

type FieldErrors = Partial<Record<string, string>>;

/** Values echoed back on error so the form isn't wiped (never the password). */
type Values = Partial<Record<string, string>>;

export type OwnerState = { error: string | null; fieldErrors?: FieldErrors; values?: Values };
export type AssistantState = { error: string | null; fieldErrors?: FieldErrors; values?: Values };

function echoValues(formData: FormData): Values {
  const values: Values = {};
  for (const [key, value] of formData.entries()) {
    if (key === 'password' || key === 'token' || typeof value !== 'string') continue;
    values[key] = value;
  }
  return values;
}

/** One French message per field ("au moins 12 caractères."), labelled for the summary. */
function invalid(error: z.ZodError, formData: FormData) {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) {
      const msg = issue.message;
      fieldErrors[key] = msg.charAt(0).toUpperCase() + msg.slice(1);
    }
  }
  if (fieldErrors.token) {
    return { error: "Ce lien d'invitation est invalide.", fieldErrors, values: echoValues(formData) };
  }
  return {
    error: firstIssueFr(error, FIELD_LABELS),
    fieldErrors,
    values: echoValues(formData),
  };
}

const EMAIL_TAKEN =
  'Un compte existe déjà avec cet email. Connectez-vous ou utilisez une autre adresse.';
const SIGNED_UP_NO_SESSION =
  'Compte créé, mais la connexion automatique a échoué. Connectez-vous depuis la page de connexion.';

function adminAuth() {
  return createClient(env().NEXT_PUBLIC_SUPABASE_URL, env().SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function acceptOwnerInvite(_: OwnerState, formData: FormData): Promise<OwnerState> {
  const parsed = ownerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, formData);

  const lookup = await lookupInvite(parsed.data.token);
  if (!lookup.ok) return { error: "Cette invitation n'est plus valide." };
  if (lookup.invite.kind !== 'tenant_owner') return { error: "Type d'invitation incorrect." };

  const auth = adminAuth();
  const created = await auth.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    const taken = created.error?.message === 'User already registered';
    return {
      error: taken ? EMAIL_TAKEN : 'Création du compte impossible. Réessayez dans un instant.',
      fieldErrors: taken ? { email: 'Email déjà utilisé.' } : undefined,
      values: echoValues(formData),
    };
  }

  const userId = created.data.user.id;
  const admin = dbAdmin();
  let createdTenantId: string | null = null;
  try {
    await admin.transaction(async (tx) => {
      const tokenHash = hashInviteToken(parsed.data.token);
      const stillValid = await tx
        .update(tenantInvites)
        .set({ consumedAt: sql`now()` })
        .where(
          sql`${tenantInvites.tokenHash} = ${tokenHash} AND ${tenantInvites.consumedAt} IS NULL AND ${tenantInvites.expiresAt} > now() AND ${tenantInvites.revokedAt} IS NULL`,
        )
        .returning();
      if (stillValid.length === 0) throw new Error('invite_no_longer_valid');

      const [tenant] = await tx
        .insert(tenants)
        .values({
          name: parsed.data.cabinetName,
          address: parsed.data.cabinetAddress || null,
          phone: parsed.data.cabinetPhone || null,
        })
        .returning();
      createdTenantId = tenant.id;

      await tx.insert(userProfiles).values({
        id: userId,
        tenantId: tenant.id,
        role: 'doctor',
        fullName: parsed.data.fullName,
        email: parsed.data.email,
      });
    });
  } catch (err) {
    await auth.auth.admin.deleteUser(userId).catch(() => undefined);
    if ((err as Error).message === 'invite_no_longer_valid') {
      return { error: "Cette invitation vient d'être utilisée." };
    }
    return {
      error: 'Erreur lors de la création du cabinet. Réessayez dans un instant.',
      values: echoValues(formData),
    };
  }

  if (createdTenantId) {
    await recordAudit({
      tenantId: createdTenantId,
      actorUserId: userId,
      action: 'tenant.invite_consumed',
      entityType: 'invite',
      metadata: { kind: 'tenant_owner' },
    });
  }

  const supabase = await getSupabaseServerClient();
  const signIn = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signIn.error) return { error: SIGNED_UP_NO_SESSION };

  redirect('/today');
}

export async function acceptAssistantInvite(
  _: AssistantState,
  formData: FormData,
): Promise<AssistantState> {
  const parsed = assistantSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, formData);

  const lookup = await lookupInvite(parsed.data.token);
  if (!lookup.ok) return { error: "Cette invitation n'est plus valide." };
  if (lookup.invite.kind !== 'assistant' || !lookup.invite.tenantId) {
    return { error: "Type d'invitation incorrect." };
  }

  const auth = adminAuth();
  const created = await auth.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    const taken = created.error?.message === 'User already registered';
    return {
      error: taken ? EMAIL_TAKEN : 'Création du compte impossible. Réessayez dans un instant.',
      fieldErrors: taken ? { email: 'Email déjà utilisé.' } : undefined,
      values: echoValues(formData),
    };
  }
  const userId = created.data.user.id;
  const tenantId = lookup.invite.tenantId;

  const admin = dbAdmin();
  try {
    await admin.transaction(async (tx) => {
      const tokenHash = hashInviteToken(parsed.data.token);
      const stillValid = await tx
        .update(tenantInvites)
        .set({ consumedAt: sql`now()` })
        .where(
          sql`${tenantInvites.tokenHash} = ${tokenHash} AND ${tenantInvites.consumedAt} IS NULL AND ${tenantInvites.expiresAt} > now() AND ${tenantInvites.revokedAt} IS NULL`,
        )
        .returning();
      if (stillValid.length === 0) throw new Error('invite_no_longer_valid');

      await tx.insert(userProfiles).values({
        id: userId,
        tenantId,
        role: 'assistant',
        fullName: parsed.data.fullName,
        email: parsed.data.email,
      });
    });
  } catch (err) {
    await auth.auth.admin.deleteUser(userId).catch(() => undefined);
    if ((err as Error).message === 'invite_no_longer_valid') {
      return { error: "Cette invitation vient d'être utilisée." };
    }
    return {
      error: 'Erreur lors de la création du compte. Réessayez dans un instant.',
      values: echoValues(formData),
    };
  }

  await recordAudit({
    tenantId,
    actorUserId: userId,
    action: 'tenant.invite_consumed',
    entityType: 'invite',
    metadata: { kind: 'assistant' },
  });

  const supabase = await getSupabaseServerClient();
  const signIn = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signIn.error) return { error: SIGNED_UP_NO_SESSION };

  redirect('/today');
}
