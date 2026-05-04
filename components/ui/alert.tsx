import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-md border p-3 flex gap-3 items-start',
  {
    variants: {
      variant: {
        info: 'bg-info-tint border-info/20 text-foreground',
        success: 'bg-success-tint border-success/20 text-foreground',
        warning: 'bg-warning-tint border-warning/30 text-foreground',
        danger: 'bg-danger-tint border-danger/20 text-foreground',
      },
    },
    defaultVariants: { variant: 'info' },
  },
);

const ICON: Record<string, ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

const ICON_COLOR: Record<string, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning-foreground',
  danger: 'text-danger',
};

const ROLE: Record<string, 'alert' | 'status'> = {
  info: 'status',
  success: 'status',
  warning: 'alert',
  danger: 'alert',
};

export type AlertProps = React.ComponentProps<'div'> &
  VariantProps<typeof alertVariants> & {
    title?: React.ReactNode;
  };

export function Alert({
  className,
  variant = 'info',
  title,
  children,
  ...props
}: AlertProps) {
  const Icon = ICON[variant!];
  return (
    <div
      data-slot="alert"
      role={ROLE[variant!]}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon
        data-slot="alert-icon"
        className={cn('size-4 mt-0.5 shrink-0', ICON_COLOR[variant!])}
        aria-hidden
      />
      <div className="flex-1 space-y-0.5">
        {title ? (
          <p className="text-body font-medium leading-none">{title}</p>
        ) : null}
        {children ? (
          <div className="text-small text-muted-foreground">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
