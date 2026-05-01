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

const ownerSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/),
  fullName: z.string().min(2).max(120),
  cabinetName: z.string().min(2).max(160),
  cabinetAddress: z.string().max(300).optional().or(z.literal('')),
  cabinetPhone: z.string().max(40).optional().or(z.literal('')),
  email: z.string().email(),
  password: z.string().min(12).max(200),
});

const assistantSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/),
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(12).max(200),
});

export type OwnerState = { error: string | null };
export type AssistantState = { error: string | null };

function adminAuth() {
  return createClient(env().NEXT_PUBLIC_SUPABASE_URL, env().SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function acceptOwnerInvite(_: OwnerState, formData: FormData): Promise<OwnerState> {
  const parsed = ownerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: 'Champs invalides.' };

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
    return {
      error:
        created.error?.message === 'User already registered'
          ? 'Email déjà utilisé.'
          : 'Création du compte impossible.',
    };
  }

  const userId = created.data.user.id;
  const admin = dbAdmin();
  try {
    await admin.transaction(async (tx) => {
      const tokenHash = hashInviteToken(parsed.data.token);
      const stillValid = await tx
        .update(tenantInvites)
        .set({ consumedAt: sql`now()` })
        .where(
          sql`${tenantInvites.tokenHash} = ${tokenHash} AND ${tenantInvites.consumedAt} IS NULL AND ${tenantInvites.expiresAt} > now()`,
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
    return { error: 'Erreur lors de la création du cabinet.' };
  }

  const supabase = await getSupabaseServerClient();
  const signIn = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signIn.error) return { error: 'Compte créé, mais connexion impossible. Allez sur /sign-in.' };

  redirect('/today');
}

export async function acceptAssistantInvite(
  _: AssistantState,
  formData: FormData,
): Promise<AssistantState> {
  const parsed = assistantSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: 'Champs invalides.' };

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
    return {
      error:
        created.error?.message === 'User already registered'
          ? 'Email déjà utilisé.'
          : 'Création du compte impossible.',
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
          sql`${tenantInvites.tokenHash} = ${tokenHash} AND ${tenantInvites.consumedAt} IS NULL AND ${tenantInvites.expiresAt} > now()`,
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
    return { error: 'Erreur lors de la création du compte.' };
  }

  const supabase = await getSupabaseServerClient();
  const signIn = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signIn.error) return { error: 'Compte créé, mais connexion impossible. Allez sur /sign-in.' };

  redirect('/today');
}
