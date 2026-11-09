'use client';

import type {
  RealtimeChannel,
  RealtimeChannelOptions,
  SupabaseClient,
} from '@supabase/supabase-js';

/**
 * Creates a Supabase realtime channel by name, but first reaps any
 * lingering channel that already has the same topic. Without this,
 * fast route transitions, HMR reloads, and React StrictMode double-
 * mounts leave the singleton client holding a half-detached channel —
 * the next `supabase.channel(name)` returns that same instance, and
 * calling `.on(...)` after it has already been subscribed throws.
 *
 * Because of the reaping, a topic must have exactly ONE owner in the
 * tree. Share it through context (see components/shell/tenant-realtime)
 * instead of opening the same topic from two components.
 */
export function createTenantChannel(
  supabase: SupabaseClient,
  name: string,
  config?: RealtimeChannelOptions['config'],
): RealtimeChannel {
  const topic = `realtime:${name}`;
  for (const ch of supabase.getChannels()) {
    if (ch.topic === topic) {
      supabase.removeChannel(ch);
    }
  }
  return config ? supabase.channel(name, { config }) : supabase.channel(name);
}

/**
 * Makes sure the realtime socket carries the signed-in user's JWT before a
 * private channel is joined (otherwise the join is evaluated as `anon` and
 * refused by the realtime.messages policies).
 */
export async function ensureRealtimeAuth(supabase: SupabaseClient): Promise<void> {
  // No argument → realtime pulls the current session token through the
  // client's accessToken callback, and keeps following token refreshes.
  await supabase.realtime.setAuth();
}
