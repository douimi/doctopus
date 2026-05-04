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
        'flex flex-col items-center justify-center text-center py-10 px-6 gap-2',
        className,
      )}
    >
      {Icon ? (
        <Icon className="size-8 text-muted-foreground" aria-hidden />
      ) : null}
      <p className="text-title font-semibold">{title}</p>
      {description ? (
        <p className="text-body text-muted-foreground max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
