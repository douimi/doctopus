import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1 text-small font-medium px-2 py-0.5 rounded-pill border',
  {
    variants: {
      variant: {
        success: 'bg-success-tint text-success border-success/20',
        warning: 'bg-warning-tint text-warning border-warning/30',
        danger: 'bg-danger-tint text-danger border-danger/20',
        info: 'bg-info-tint text-info border-info/20',
        neutral: 'bg-muted text-muted-foreground border-border',
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
  };

export function StatusBadge({
  className,
  variant,
  icon: Icon,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ variant }), className)}
      {...props}
    >
      {Icon ? <Icon className="size-3" aria-hidden /> : null}
      {children}
    </span>
  );
}
