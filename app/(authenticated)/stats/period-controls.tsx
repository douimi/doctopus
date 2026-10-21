'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type MonthOption = { key: string; label: string };

// Native <select> on purpose (instant GET navigation, good on mobile);
// styled like the design-system field.
const selectClass =
  'h-8 rounded-lg border border-input bg-background px-2.5 text-body text-foreground capitalize outline-none transition-colors duration-(--duration-fast) focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15';

/**
 * Month navigator + "compare to" picker for the monthly stats view.
 * Plain GET navigation so every comparison is a shareable URL.
 */
export function MonthControls({
  month,
  compare,
  months,
  prevHref,
  nextHref,
}: {
  month: string;
  compare: string;
  /** Most recent first; never includes future months. */
  months: MonthOption[];
  prevHref: string | null;
  nextHref: string | null;
}) {
  const router = useRouter();
  const go = (m: string, c: string) => router.push(`/stats?month=${m}&compare=${c}`);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-1">
        <NavLink href={prevHref} label="Mois précédent">
          <ChevronLeft aria-hidden />
        </NavLink>
        <label className="sr-only" htmlFor="stats-month">
          Mois affiché
        </label>
        <select
          id="stats-month"
          className={cn(selectClass, 'font-medium')}
          value={month}
          // Moving the displayed month keeps "previous month" comparisons
          // relative: only a custom pick stays pinned.
          onChange={(e) => go(e.target.value, '')}
        >
          {months.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        <NavLink href={nextHref} label="Mois suivant">
          <ChevronRight aria-hidden />
        </NavLink>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="stats-compare" className="text-small text-muted-foreground">
          Comparer à
        </label>
        <select
          id="stats-compare"
          className={selectClass}
          value={compare}
          onChange={(e) => go(month, e.target.value)}
        >
          {months
            .filter((m) => m.key !== month)
            .map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  const cls = buttonVariants({ variant: 'secondary', size: 'icon-sm' });
  if (!href) {
    return (
      <span aria-disabled className={cn(cls, 'opacity-40 pointer-events-none')} aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cls} aria-label={label} title={label}>
      {children}
    </Link>
  );
}
