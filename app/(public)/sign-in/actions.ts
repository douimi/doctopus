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
  email: z.string().trim().email('Adresse email invalide.'),
  password: z.string().min(1, 'Saisissez votre mot de passe.'),
  next: z.string().optional(),
});

export type SignInState = {
  error: string | null;
  fieldErrors?: { email?: string; password?: string };
  /** Echoed back so the email survives React 19's form reset on error. */
  email?: string;
};

export async function signInAction(_: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next'),
  });
  const rawEmail = String(formData.get('email') ?? '');
  if (!parsed.success) {
    const fieldErrors: NonNullable<SignInState['fieldErrors']> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if ((key === 'email' || key === 'password') && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    const hasFieldError = Boolean(fieldErrors.email || fieldErrors.password);
    return {
      error: hasFieldError ? null : 'Email ou mot de passe invalide.',
      fieldErrors,
      email: rawEmail,
    };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    recordAuditUnscoped('auth.sign_in_failed', { email: parsed.data.email });
    return {
      error: 'Identifiants incorrects. Vérifiez votre email et votre mot de passe.',
      email: rawEmail,
    };
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
