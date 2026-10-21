import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type EmptyStateProps = {
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description?: string;
  action?: ReactNode;
  /** `sm` = compact, icon-less variant for empty states inside cards. */
  size?: 'default' | 'sm';
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'default',
  className,
}: EmptyStateProps) {
  const compact = size === 'sm';
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 text-center',
        compact ? 'py-6' : 'py-10',
        className,
      )}
    >
      {Icon && !compact ? (
        // Neutral disc on purpose: empty is not a brand moment.
        <div
          aria-hidden
          className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-inset ring-border"
        >
          <Icon className="size-5" aria-hidden />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-heading font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-body text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
