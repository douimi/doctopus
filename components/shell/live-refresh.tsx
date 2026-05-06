'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const REFRESH_DEBOUNCE_MS = 200;
/**
 * Safety-net polling interval. Even if Supabase Realtime is broken
 * (migration 0010 not applied, RLS blocking the channel, websocket
 * dropped, etc.), we still call router.refresh() every N seconds so
 * the doctor and assistant stay in sync within at most this delay.
 *
 * router.refresh() is server-rendered and cheap (just re-runs the
 * RSC tree), so 10s is comfortable.
 */
const POLL_INTERVAL_MS = 10_000;

const DEFAULT_TABLES = ['appointments', 'consultations'] as const;

/**
 * Subscribes to Supabase Realtime changes on the given tables (filtered by
 * tenant_id) and triggers `router.refresh()` whenever something changes.
 *
 * Two refresh paths run in parallel:
 *   1. Realtime postgres_changes (instant, the happy path).
 *   2. A 10s polling fallback (resilient — recovers from any Realtime
 *      misconfiguration without user intervention).
 *
 * Both share a single debounce so they don't trigger redundant refreshes.
 *
 * Mounted on screens where the doctor or assistant should see updates flow
 * in without manual refresh — /today, /consultations, /consultations/[id].
 */
export function LiveRefresh({
  tenantId,
  channel,
  tables = DEFAULT_TABLES as unknown as readonly string[],
}: {
  tenantId: string;
  /** Unique channel name per page so concurrent subscribers don't collide. */
  channel: string;
  tables?: readonly string[];
}) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const scheduleRefresh = () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
    };

    let ch = supabase.channel(`${channel}:${tenantId}`);
    for (const table of tables) {
      ch = ch.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `tenant_id=eq.${tenantId}`,
        },
        scheduleRefresh,
      );
    }
    ch.subscribe();

    // Polling safety net — fires regardless of realtime state.
    const poll = setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);

    // Refresh once when the tab regains focus (e.g. user switches back).
    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(ch);
    };
  }, [tenantId, channel, tables, router]);

  return null;
}
