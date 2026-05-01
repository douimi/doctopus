'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';

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
  if (error) return { error: 'Identifiants incorrects.' };

  redirect(parsed.data.next?.startsWith('/') ? parsed.data.next : '/today');
}
