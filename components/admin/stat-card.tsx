import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'admin',
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tone?: 'admin' | 'primary' | 'success' | 'warning' | 'danger';
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
      </div>
    </div>
  );
}
