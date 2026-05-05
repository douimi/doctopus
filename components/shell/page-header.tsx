import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'px-6 pt-6 pb-5 border-b border-border bg-card',
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4',
        className,
      )}
    >
      <div className="space-y-1 min-w-0">
        {eyebrow ? (
          <p className="text-small font-medium text-muted-foreground uppercase tracking-wide first-letter:capitalize">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-display font-semibold leading-tight tracking-tight truncate">
          {title}
        </h1>
        {description ? (
          <p className="text-body text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
      ) : null}
    </div>
  );
}
