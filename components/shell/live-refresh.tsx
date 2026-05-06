'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const REFRESH_DEBOUNCE_MS = 200;

const DEFAULT_TABLES = ['appointments', 'consultations'] as const;

/**
 * Subscribes to Supabase Realtime changes on the given tables (filtered by
 * tenant_id) and triggers `router.refresh()` whenever something changes.
 *
 * Mounted on screens where the doctor or assistant should see updates flow
 * in without manual refresh — /today, /consultations, /consultations/[id].
 *
 * One channel per page; tables default to appointments + consultations.
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const scheduleRefresh = () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
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

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      supabase.removeChannel(ch);
    };
  }, [tenantId, channel, tables, router]);

  return null;
}
