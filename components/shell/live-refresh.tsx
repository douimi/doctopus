'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { createTenantChannel } from '@/lib/supabase/realtime';

const REFRESH_DEBOUNCE_MS = 200;

const DEFAULT_TABLES = ['appointments', 'consultations'] as const;

/**
 * Subscribes to Supabase Realtime changes on the given tables (filtered by
 * tenant_id) and triggers `router.refresh()` whenever something changes.
 *
 * Refresh paths:
 *   1. Realtime postgres_changes — instant, the happy path.
 *   2. visibilitychange — fire once when the tab regains focus, so a user
 *      who walked away (laptop suspend, tab switch) gets fresh data on
 *      return without paying for periodic background polling.
 *
 * Both share a single 200ms debounce so they never trigger redundant
 * refreshes.
 *
 * Mounted on /today, /consultations, /consultations/[id].
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

    let ch = createTenantChannel(supabase, `${channel}:${tenantId}`);
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

    const onVisible = () => {
      if (document.visibilityState === 'visible') scheduleRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(ch);
    };
  }, [tenantId, channel, tables, router]);

  return null;
}
