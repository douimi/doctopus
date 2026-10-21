import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatComparison = {
  /** Relative change as a ratio (0.12 = +12 %); null when the baseline is 0. */
  ratio: number | null;
  /** e.g. "vs sept. 2026 (1–21)". */
  label: string;
  /** The baseline value, already formatted, shown on hover/for screen readers. */
  previous?: string;
  /** For metrics where a rise is bad (e.g. unpaid amounts). */
  invert?: boolean;
};

export type StatTone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary' | 'admin';

function formatRatio(r: number): string {
  const pct = Math.round(r * 100);
  return `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)} %`;
}

function ComparisonLine({ c }: { c: StatComparison }) {
  const flat = c.ratio !== null && Math.round(c.ratio * 100) === 0;
  const up = c.ratio !== null && c.ratio > 0 && !flat;
  const good = c.invert ? !up : up;
  const Icon = c.ratio === null || flat ? ArrowRight : up ? ArrowUpRight : ArrowDownRight;
  const tone =
    c.ratio === null || flat
      ? 'text-muted-foreground'
      : good
        ? 'text-success-ink'
        : 'text-danger-ink';
  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-x-1.5 text-small"
      title={c.previous ? `Avant : ${c.previous}` : undefined}
    >
      <span className={cn('inline-flex items-center gap-0.5 font-medium tabular-nums', tone)}>
        <Icon className="size-3.5" aria-hidden />
        {c.ratio === null ? 'nouveau' : formatRatio(c.ratio)}
      </span>
      <span className="text-muted-foreground">
        {c.label}
        {c.previous ? <span className="tabular-nums"> · {c.previous}</span> : null}
      </span>
    </div>
  );
}

// A tone only adds a 2px leading bar and colours the value — use it when the
// number needs attention, not for decoration. `primary` / `admin` are kept
// for the admin dashboard; the doctor app never uses `admin`.
const TONE_BAR: Record<StatTone, string> = {
  neutral: '',
  primary: 'before:bg-primary',
  success: 'before:bg-success',
  warning: 'before:bg-warning',
  danger: 'before:bg-danger',
  admin: 'before:bg-admin',
};

const TONE_VALUE: Record<StatTone, string> = {
  neutral: 'text-foreground',
  primary: 'text-primary-ink',
  success: 'text-success-ink',
  warning: 'text-warning-ink',
  danger: 'text-danger-ink',
  admin: 'text-admin-ink',
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  comparison,
  href,
  className,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tone?: StatTone;
  comparison?: StatComparison;
  /** Makes the whole card a link (and only then gets the hover lift). */
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow truncate">{label}</span>
        {Icon ? <Icon className="size-4 shrink-0 text-subtle-foreground" aria-hidden /> : null}
      </div>
      <div
        className={cn(
          'mt-2 truncate text-display font-semibold tabular-nums',
          TONE_VALUE[tone],
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-small text-muted-foreground">{hint}</div> : null}
      {comparison ? <ComparisonLine c={comparison} /> : null}
    </>
  );
  const classes = cn(
    'panel relative block min-w-0 overflow-hidden p-4',
    tone !== 'neutral' &&
      'before:absolute before:inset-y-0 before:left-0 before:w-0.5',
    TONE_BAR[tone],
    href &&
      'card-hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    className,
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}
