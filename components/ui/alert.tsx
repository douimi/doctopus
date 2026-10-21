import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative flex w-full items-start gap-2.5 rounded-lg border p-3',
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
  info: 'text-info-ink',
  success: 'text-success-ink',
  warning: 'text-warning-ink',
  danger: 'text-danger-ink',
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
      <div className="min-w-0 flex-1 space-y-0.5">
        {title ? (
          <p className="text-body font-medium text-foreground">{title}</p>
        ) : null}
        {children ? (
          <div className="text-small text-foreground/80">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
