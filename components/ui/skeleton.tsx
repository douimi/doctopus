import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'animate-pulse rounded-tight bg-muted',
        className,
      )}
      {...props}
    />
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: columns }, (_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
