'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'doctopus.notifications.lastSeenAt';

/**
 * Bell-icon notification indicator. Subscribes globally to changes on
 * appointments + consultations for the current tenant, counts events
 * since the last "seen" timestamp, and shows a red dot + count when
 * non-zero.
 *
 * Click → resets the counter, saves the new lastSeenAt to localStorage,
 * navigates to /today (where the live data lives).
 *
 * Sits in the sidebar brand area; mounted by the doctor shell.
 */
export function NotificationBell({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const lastSeenAtRef = useRef<number>(Date.now());

  // Bootstrap from localStorage so a reload doesn't lose the timestamp.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed)) {
      lastSeenAtRef.current = parsed;
    } else {
      lastSeenAtRef.current = Date.now();
      window.localStorage.setItem(STORAGE_KEY, String(lastSeenAtRef.current));
    }
  }, []);

  // Reset counter automatically when the user is on /today (the screen
  // that fully renders these events). Avoids "1 new" while staring at it.
  useEffect(() => {
    if (pathname === '/today' && count > 0) {
      const now = Date.now();
      lastSeenAtRef.current = now;
      window.localStorage.setItem(STORAGE_KEY, String(now));
      setCount(0);
    }
  }, [pathname, count]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const tickIfNew = (payload: { commit_timestamp?: string }) => {
      // Filter out events that arrived before our lastSeenAt — Supabase
      // sometimes replays a few records on reconnect.
      const ts = payload.commit_timestamp ? Date.parse(payload.commit_timestamp) : Date.now();
      if (Number.isFinite(ts) && ts <= lastSeenAtRef.current) return;
      setCount((c) => c + 1);
    };

    const channel = supabase
      .channel(`notifications:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `tenant_id=eq.${tenantId}`,
        },
        tickIfNew,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultations',
          filter: `tenant_id=eq.${tenantId}`,
        },
        tickIfNew,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  function handleClick() {
    const now = Date.now();
    lastSeenAtRef.current = now;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(now));
    }
    setCount(0);
    router.push('/today');
  }

  const hasUnread = count > 0;
  const displayCount = count > 99 ? '99+' : String(count);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        hasUnread
          ? `${count} nouvelle${count === 1 ? '' : 's'} activité${
              count === 1 ? '' : 's'
            } — voir l'aujourd'hui`
          : "Aucune nouvelle activité"
      }
      title={
        hasUnread
          ? `${count} nouvelle${count === 1 ? '' : 's'} activité${count === 1 ? '' : 's'}`
          : 'Aucune nouvelle activité'
      }
      className={cn(
        'relative inline-flex items-center justify-center size-9 rounded-md transition-colors',
        'hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
        hasUnread ? 'text-foreground' : 'text-muted-foreground',
      )}
      style={{ transitionDuration: 'var(--duration-fast)' }}
    >
      <Bell className="size-4" aria-hidden />
      {hasUnread ? (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-pill bg-danger text-[10px] font-semibold text-danger-foreground tabular-nums leading-none"
        >
          {displayCount}
        </span>
      ) : null}
    </button>
  );
}
