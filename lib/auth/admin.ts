import 'server-only';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type AdminSession = { userId: string; email: string };

// Reads process.env directly (not the cached env() getter) so that the
// allowlist reflects mutations in tests and respects runtime changes.
function allowList(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return allowList().some((entry) => {
    if (entry === '*') return true;
    if (entry.startsWith('*@') && lower.endsWith(entry.slice(1))) return true;
    return entry === lower;
  });
}

export async function loadAdminSession(): Promise<AdminSession | null> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return null;
  if (!isAdminEmail(data.user.email)) return null;
  return { userId: data.user.id, email: data.user.email };
}

export async function requireAdmin(): Promise<AdminSession> {
  const s = await loadAdminSession();
  if (!s) redirect('/sign-in?next=/admin');
  return s;
}
