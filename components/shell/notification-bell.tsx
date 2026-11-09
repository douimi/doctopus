'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, CheckCircle2, ClipboardCheck, UserPlus, Wallet } from 'lucide-react';
import { type TenantActivity, useTenantActivity } from './tenant-realtime';
import { buttonVariants } from '@/components/ui/button';
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

function categorize(event: TenantActivity): Category | null {
  if (event.table === 'appointments') {
    if (event.status !== 'waiting') return null;
    if (event.op === 'INSERT') return 'arrival';
    if (event.op === 'UPDATE' && event.oldStatus !== 'waiting') return 'arrival';
    return null;
  }
  if (event.op === 'UPDATE') {
    if (event.isFinalized === true && event.oldIsFinalized !== true) return 'finalized';
    if (event.paymentStatus === 'paid' && event.oldPaymentStatus !== 'paid') return 'payment';
  }
  return null;
}

/**
 * Bell-icon notification indicator. Listens to tenant activity pings
 * (appointments + consultations) and categorises each change (arrival /
 * finalized / payment). Shows a red badge with the total since
 * lastSeenAt; click reveals a small panel with the per-category
 * breakdown and a link to /today.
 */
export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [counts, setCounts] = useState<Counts>(ZERO_COUNTS);
  const [open, setOpen] = useState(false);
  // Seeded from localStorage (or now) in the bootstrap effect below.
  const lastSeenAtRef = useRef<number>(0);
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
  // that fully renders these events). The state reset happens during
  // render (React's "adjust state on prop change" pattern); the effect only
  // persists the new lastSeenAt.
  const onToday = pathname === '/today';
  if (onToday && total > 0) setCounts(ZERO_COUNTS);
  useEffect(() => {
    if (!onToday) return;
    const now = Date.now();
    lastSeenAtRef.current = now;
    window.localStorage.setItem(STORAGE_KEY, String(now));
  }, [onToday, total]);

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

  useTenantActivity((event) => {
    const category = categorize(event);
    if (!category) return;
    setCounts((c) => ({ ...c, [category]: c[category] + 1 }));
  });

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
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'relative',
          hasUnread && 'text-foreground',
        )}
      >
        <Bell className="size-4" aria-hidden />
        {hasUnread ? (
          <span
            aria-hidden
            className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none tabular-nums text-danger-foreground ring-2 ring-sidebar"
          >
            {displayCount}
          </span>
        ) : null}
      </button>

      {open && hasUnread ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-popover"
        >
          <ul className="divide-y divide-border">
            {(Object.entries(counts) as [Category, number][])
              .filter(([, n]) => n > 0)
              .map(([key, n]) => {
                const Icon = CATEGORY_META[key].icon;
                return (
                  <li key={key} className="flex items-center gap-2.5 px-3 py-2.5 text-small">
                    <Icon className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
                    <span className="flex-1 text-foreground">
                      {CATEGORY_META[key].label(n)}
                    </span>
                  </li>
                );
              })}
          </ul>
          <button
            type="button"
            onClick={clearAndGo}
            className="flex w-full items-center gap-2 border-t border-border bg-canvas px-3 py-2.5 text-left text-small font-medium text-primary transition-colors duration-(--duration-fast) hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <CheckCircle2 className="size-4" aria-hidden />
            Marquer comme lu · voir Aujourd’hui
          </button>
        </div>
      ) : null}
    </div>
  );
}
