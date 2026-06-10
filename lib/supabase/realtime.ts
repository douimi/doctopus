'use client';

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase realtime channel by name, but first reaps any
 * lingering channel that already has the same topic. Without this,
 * fast route transitions, HMR reloads, and React StrictMode double-
 * mounts leave the singleton client holding a half-detached channel —
 * the next `supabase.channel(name)` returns that same instance, and
 * calling `.on('postgres_changes', ...)` after it has already been
 * subscribed throws:
 *
 *   "cannot add `postgres_changes` callbacks for realtime:foo:bar
 *    after `subscribe()`"
 *
 * Use exactly the same chain you would otherwise — `.on(...).on(...)
 * .subscribe()` — on the returned channel.
 */
export function createTenantChannel(
  supabase: SupabaseClient,
  name: string,
): RealtimeChannel {
  const topic = `realtime:${name}`;
  for (const ch of supabase.getChannels()) {
    if (ch.topic === topic) {
      supabase.removeChannel(ch);
    }
  }
  return supabase.channel(name);
}
