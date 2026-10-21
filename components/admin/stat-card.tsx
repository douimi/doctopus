import type { ComponentType } from 'react';
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
        ? 'text-success'
        : 'text-danger';
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 text-small" title={c.previous ? `Avant : ${c.previous}` : undefined}>
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

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'admin',
  comparison,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tone?: 'admin' | 'primary' | 'success' | 'warning' | 'danger';
  comparison?: StatComparison;
  className?: string;
}) {
  const toneClasses: Record<NonNullable<typeof tone>, string> = {
    admin: 'bg-admin-tint text-admin',
    primary: 'bg-primary-tint text-primary',
    success: 'bg-success-tint text-success',
    warning: 'bg-warning-tint text-warning',
    danger: 'bg-danger-tint text-danger',
  };
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card shadow-card p-4 flex items-start gap-3 card-hover-lift',
        className,
      )}
    >
      {Icon ? (
        <div
          aria-hidden
          className={cn(
            'flex items-center justify-center size-10 rounded-md shrink-0',
            toneClasses[tone],
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
      ) : null}
      <div className="space-y-1 min-w-0">
        <div className="text-small text-muted-foreground uppercase tracking-wide font-medium">
          {label}
        </div>
        <div className="text-display font-semibold leading-none tabular-nums truncate">
          {value}
        </div>
        {hint ? (
          <div className="text-small text-muted-foreground">{hint}</div>
        ) : null}
        {comparison ? <ComparisonLine c={comparison} /> : null}
      </div>
    </div>
  );
}
