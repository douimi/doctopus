'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { dbAdmin } from '@/db/client';
import { userProfiles } from '@/db/schema';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { recordAudit, recordAuditUnscoped } from '@/lib/audit/record';
import { isAdminEmail } from '@/lib/auth/admin';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export type SignInState = { error: string | null };

export async function signInAction(_: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next'),
  });
  if (!parsed.success) return { error: 'Email ou mot de passe invalide.' };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    recordAuditUnscoped('auth.sign_in_failed', { email: parsed.data.email });
    return { error: 'Identifiants incorrects.' };
  }

  const { data: userData } = await supabase.auth.getUser();

  if (userData.user?.email && isAdminEmail(userData.user.email)) {
    recordAuditUnscoped('auth.sign_in_success', {
      email: userData.user.email,
      kind: 'admin',
    });
    const target = parsed.data.next?.startsWith('/admin') ? parsed.data.next : '/admin';
    redirect(target);
  }

  if (userData.user) {
    const profile = await dbAdmin().query.userProfiles.findFirst({
      where: eq(userProfiles.id, userData.user.id),
    });
    if (profile) {
      await recordAudit({
        tenantId: profile.tenantId,
        actorUserId: profile.id,
        action: 'auth.sign_in_success',
        metadata: { email: profile.email },
      });
    }
  }

  redirect(parsed.data.next?.startsWith('/') ? parsed.data.next : '/today');
}
