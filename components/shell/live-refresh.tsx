'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtimeReconnect, useTenantActivity } from './tenant-realtime';

const REFRESH_DEBOUNCE_MS = 200;

type Table = 'appointments' | 'consultations';
const DEFAULT_TABLES: readonly Table[] = ['appointments', 'consultations'];

/**
 * Triggers `router.refresh()` whenever the cabinet's appointments or
 * consultations change.
 *
 * Refresh paths:
 *   1. Tenant activity broadcast (private `tenant:<id>` channel, owned by
 *      TenantRealtimeProvider) — instant, the happy path. Content-only
 *      consultation autosaves are not broadcast, so an open editor is
 *      never refreshed under the doctor's fingers.
 *   2. Channel (re)join — covers events missed while the socket was down.
 *   3. visibilitychange — once when the tab regains focus.
 *
 * All paths share a single 200ms debounce.
 *
 * Mounted on /today, /today/payments, /consultations, /consultations/[id].
 */
export function LiveRefresh({ tables = DEFAULT_TABLES }: { tables?: readonly Table[] }) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = () => {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
  };

  useTenantActivity((event) => {
    if (tables.includes(event.table)) scheduleRefresh();
  });

  useRealtimeReconnect(scheduleRefresh);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        if (debounceRef.current !== null) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router]);

  return null;
}
