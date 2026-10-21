import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

// Square-ish (rounded-md) badges read as data in tables; pills are for
// filters only. Text uses the `*-ink` tokens, which are AA on their tint.
const statusBadgeVariants = cva(
  'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-small font-medium ring-1 ring-inset',
  {
    variants: {
      variant: {
        success: 'bg-success-tint text-success-ink ring-success/20',
        warning: 'bg-warning-tint text-warning-ink ring-warning/30',
        danger: 'bg-danger-tint text-danger-ink ring-danger/20',
        info: 'bg-info-tint text-info-ink ring-info/20',
        neutral: 'bg-muted text-muted-foreground ring-border',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export type StatusBadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof statusBadgeVariants> & {
    icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    /** Leading status dot in the badge's colour. Ignored when `icon` is set. */
    dot?: boolean;
  };

export function StatusBadge({
  className,
  variant,
  icon: Icon,
  dot,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ variant }), className)}
      {...props}
    >
      {Icon ? (
        <Icon className="size-3.5" aria-hidden />
      ) : dot ? (
        <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}
