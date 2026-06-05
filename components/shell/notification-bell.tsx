'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, CheckCircle2, ClipboardCheck, UserPlus, Wallet } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'doctopus.notifications.lastSeenAt';

type Category = 'arrival' | 'finalized' | 'payment';
type Counts = Record<Category, number>;

const ZERO_COUNTS: Counts = { arrival: 0, finalized: 0, payment: 0 };

const CATEGORY_META: Record<
  Category,
  { label: (n: number) => string; icon: typeof Bell }
> = {
  arrival: {
    label: (n) => `${n} arrivée${n === 1 ? '' : 's'} en salle d'attente`,
    icon: UserPlus,
  },
  finalized: {
    label: (n) => `${n} consultation${n === 1 ? '' : 's'} finalisée${n === 1 ? '' : 's'}`,
    icon: ClipboardCheck,
  },
  payment: {
    label: (n) => `${n} paiement${n === 1 ? '' : 's'} encaissé${n === 1 ? '' : 's'}`,
    icon: Wallet,
  },
};

type AppointmentRow = { status?: string | null };
type ConsultationRow = {
  is_finalized?: boolean | null;
  payment_status?: string | null;
};

function categorize(payload: {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: unknown;
  old: unknown;
}): Category | null {
  if (payload.table === 'appointments') {
    const n = payload.new as AppointmentRow | null;
    const o = payload.old as AppointmentRow | null;
    if (n?.status !== 'waiting') return null;
    if (payload.eventType === 'INSERT') return 'arrival';
    if (payload.eventType === 'UPDATE' && o?.status !== 'waiting') return 'arrival';
    return null;
  }
  if (payload.table === 'consultations' && payload.eventType === 'UPDATE') {
    const n = payload.new as ConsultationRow | null;
    const o = payload.old as ConsultationRow | null;
    if (n?.is_finalized === true && o?.is_finalized !== true) return 'finalized';
    if (n?.payment_status === 'paid' && o?.payment_status !== 'paid') return 'payment';
  }
  return null;
}

/**
 * Bell-icon notification indicator. Subscribes to appointments +
 * consultations realtime and categorises each change (arrival /
 * finalized / payment). Shows a red badge with the total since
 * lastSeenAt; click reveals a small panel with the per-category
 * breakdown and a link to /today.
 */
export function NotificationBell({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [counts, setCounts] = useState<Counts>(ZERO_COUNTS);
  const [open, setOpen] = useState(false);
  const lastSeenAtRef = useRef<number>(Date.now());
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const total = counts.arrival + counts.finalized + counts.payment;
  const hasUnread = total > 0;
  const displayCount = total > 99 ? '99+' : String(total);

  const titleText = useMemo(() => {
    if (!hasUnread) return 'Aucune nouvelle activité';
    const parts = (Object.entries(counts) as [Category, number][])
      .filter(([, n]) => n > 0)
      .map(([k, n]) => CATEGORY_META[k].label(n));
    return parts.join(' · ');
  }, [counts, hasUnread]);

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
  // that fully renders these events).
  useEffect(() => {
    if (pathname === '/today' && total > 0) {
      const now = Date.now();
      lastSeenAtRef.current = now;
      window.localStorage.setItem(STORAGE_KEY, String(now));
      setCounts(ZERO_COUNTS);
    }
  }, [pathname, total]);

  // Close the popover when clicking outside.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const tick = (payload: {
      table: string;
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: unknown;
      old: unknown;
      commit_timestamp?: string;
    }) => {
      // Filter out replays older than lastSeenAt — Supabase sometimes
      // re-sends a few records on reconnect.
      const ts = payload.commit_timestamp ? Date.parse(payload.commit_timestamp) : Date.now();
      if (Number.isFinite(ts) && ts <= lastSeenAtRef.current) return;
      const category = categorize(payload);
      if (!category) return;
      setCounts((c) => ({ ...c, [category]: c[category] + 1 }));
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
        tick,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultations',
          filter: `tenant_id=eq.${tenantId}`,
        },
        tick,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  function clearAndGo() {
    const now = Date.now();
    lastSeenAtRef.current = now;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(now));
    }
    setCounts(ZERO_COUNTS);
    setOpen(false);
    router.push('/today');
  }

  function toggleOpen() {
    if (!hasUnread) {
      // Nothing to show — keep current behaviour and jump straight to /today.
      router.push('/today');
      return;
    }
    setOpen((v) => !v);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={titleText}
        aria-expanded={open}
        aria-haspopup="menu"
        title={titleText}
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

      {open && hasUnread ? (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-30 w-64 rounded-xl border border-border bg-card shadow-card overflow-hidden"
        >
          <ul className="divide-y divide-border">
            {(Object.entries(counts) as [Category, number][])
              .filter(([, n]) => n > 0)
              .map(([key, n]) => {
                const Icon = CATEGORY_META[key].icon;
                return (
                  <li key={key} className="px-3 py-2 flex items-center gap-2.5">
                    <Icon className="size-4 text-muted-foreground shrink-0" aria-hidden />
                    <span className="flex-1 text-small text-foreground">
                      {CATEGORY_META[key].label(n)}
                    </span>
                  </li>
                );
              })}
          </ul>
          <button
            type="button"
            onClick={clearAndGo}
            className="w-full px-3 py-2 text-small font-medium text-left border-t border-border bg-muted/30 hover:bg-muted transition-colors flex items-center gap-2"
            style={{ transitionDuration: 'var(--duration-fast)' }}
          >
            <CheckCircle2 className="size-4 text-success" aria-hidden />
            Marquer comme lu et voir l’aujourd’hui
          </button>
        </div>
      ) : null}
    </div>
  );
}
