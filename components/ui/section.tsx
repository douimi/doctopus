import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Section({
  icon: Icon,
  title,
  count,
  description,
  actions,
  children,
  className,
}: {
  /** Optional, subtle — keep icons for Today only. */
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: ReactNode;
  count?: number;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <header className="flex min-h-8 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <Icon className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
          ) : null}
          <h2 className="truncate text-heading font-semibold text-foreground">{title}</h2>
          {typeof count === 'number' ? (
            <span
              aria-hidden
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-muted px-1.5 text-micro font-semibold tabular-nums text-muted-foreground"
            >
              {count}
            </span>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      {description ? (
        <p className="-mt-1.5 text-small text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </section>
  );
}
