import type { ReactNode } from 'react';
import type { ChartTokens } from '@/lib/charts/tokens';
import { cn } from '@/lib/utils';

/**
 * Shared Recharts styling for the stats page ("quiet clinical"):
 * horizontal hairline grid, no axis lines, 12px muted ticks, popover-like
 * tooltip. Tooltip content is plain HTML, so CSS variables work there.
 */
export const tooltipContentStyle = {
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  boxShadow: 'var(--shadow-popover)',
  fontSize: 13,
  padding: '8px 10px',
} as const;

export const tooltipLabelStyle = { color: 'var(--muted-foreground)', marginBottom: 2 } as const;

export function gridProps(t: ChartTokens) {
  return { stroke: t['--border'], vertical: false, strokeDasharray: '0' } as const;
}

export function axisProps(t: ChartTokens) {
  return {
    tick: { fontSize: 12, fill: t['--muted-foreground'] },
    axisLine: false,
    tickLine: false,
  } as const;
}

/** Bordered chart surface with an optional eyebrow label + headline total. */
export function ChartPanel({
  label,
  total,
  className,
  children,
}: {
  label?: ReactNode;
  total?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('panel p-4', className)}>
      {label || total ? (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {label ? <span className="eyebrow">{label}</span> : <span />}
          {total ? (
            <span className="text-title font-semibold tabular-nums text-foreground">{total}</span>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
