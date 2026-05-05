import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type EmptyStateProps = {
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6 gap-3',
        className,
      )}
    >
      {Icon ? (
        <div
          aria-hidden
          className="flex items-center justify-center size-12 rounded-pill bg-primary-tint text-primary"
        >
          <Icon className="size-5" aria-hidden />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-heading font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="text-body text-muted-foreground max-w-sm mx-auto">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
