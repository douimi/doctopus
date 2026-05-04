import 'server-only';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { dbAdmin } from '@/db/client';
import { userProfiles, tenants } from '@/db/schema';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type Session = {
  userId: string;
  tenantId: string;
  role: 'doctor' | 'assistant';
  fullName: string;
  email: string;
  tenantName: string;
};

export async function loadSession(): Promise<Session | null> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const admin = dbAdmin();
  const profile = await admin.query.userProfiles.findFirst({
    where: eq(userProfiles.id, data.user.id),
  });
  if (!profile || !profile.isActive) return null;

  const tenant = await admin.query.tenants.findFirst({ where: eq(tenants.id, profile.tenantId) });
  if (!tenant || tenant.status === 'suspended') return null;

  return {
    userId: profile.id,
    tenantId: profile.tenantId,
    role: profile.role,
    fullName: profile.fullName,
    email: profile.email,
    tenantName: tenant.name,
  };
}

export async function requireSession(): Promise<Session> {
  const s = await loadSession();
  if (!s) redirect('/sign-in');
  return s;
}
