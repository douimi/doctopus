import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Section({
  icon: Icon,
  title,
  count,
  actions,
  children,
  className,
}: {
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: ReactNode;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {Icon ? (
            <Icon className="size-4 text-muted-foreground shrink-0" aria-hidden />
          ) : null}
          <h2 className="text-heading font-semibold leading-none truncate">{title}</h2>
          {typeof count === 'number' ? (
            <span
              aria-hidden
              className="inline-flex items-center justify-center min-w-5 px-1.5 h-5 rounded-pill bg-muted text-muted-foreground text-small font-medium tabular-nums"
            >
              {count}
            </span>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
