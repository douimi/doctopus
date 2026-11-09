import { randomUUID } from 'node:crypto';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { dbAdmin } from '@/db/client';
import { tenants, userProfiles } from '@/db/schema';

const PASSWORD = 'Realtime-test-password-42!';

function url() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

function adminAuth() {
  return createClient(url(), process.env.SUPABASE_SERVICE_ROLE!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AuthedUser = { id: string; email: string; tenantId: string };

/** Creates a real auth user (GoTrue) and a matching user_profiles row. */
export async function seedAuthedUser(
  tenantId: string,
  role: 'doctor' | 'assistant',
  label: string,
): Promise<AuthedUser> {
  const email = `${role}-${label}-${randomUUID().slice(0, 8)}@test.local`;
  const { data, error } = await adminAuth().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error('createUser failed');
  await dbAdmin()
    .insert(userProfiles)
    .values({ id: data.user.id, tenantId, role, fullName: `${role} ${label}`, email });
  return { id: data.user.id, email, tenantId };
}

/** Tenant with an authenticated doctor + assistant. */
export async function seedAuthedTenant(label: string) {
  const [tenant] = await dbAdmin().insert(tenants).values({ name: `Cabinet ${label}` }).returning();
  const doctor = await seedAuthedUser(tenant.id, 'doctor', label);
  const assistant = await seedAuthedUser(tenant.id, 'assistant', label);
  return { tenantId: tenant.id, doctor, assistant };
}

/** Browser-like client signed in as `user`, with realtime authorized. */
export async function signIn(user: AuthedUser): Promise<SupabaseClient> {
  const client = createClient(url(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: PASSWORD });
  if (error) throw error;
  await client.realtime.setAuth();
  return client;
}

/** Resolves with the final join status of a channel (SUBSCRIBED or an error). */
export function joinStatus(channel: RealtimeChannel, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('TIMED_OUT'), timeoutMs);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timer);
        resolve(status);
      }
    });
  });
}

/** Collects broadcast payloads of `event` on `channel` (call before join). */
export function collect<T = unknown>(channel: RealtimeChannel, event: string) {
  const received: T[] = [];
  channel.on('broadcast', { event }, ({ payload }) => received.push(payload as T));
  return {
    received,
    async waitFor(pred: (p: T) => boolean, timeoutMs = 6000): Promise<T | null> {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const hit = received.find(pred);
        if (hit) return hit;
        await new Promise((r) => setTimeout(r, 50));
      }
      return null;
    },
  };
}
