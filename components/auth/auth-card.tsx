import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PublicShell } from './public-shell';

/**
 * Centered card for sign-in and invitation flows, framed by the public
 * shell (logo top-left, same light surface as the landing).
 */
export function AuthCard({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  width = 'sm',
  className,
}: {
  eyebrow?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Quiet line under the card (help, alternate path). */
  footer?: ReactNode;
  /** `md` for the longer owner sign-up form. */
  width?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <PublicShell>
      <div className={cn('w-full space-y-4', width === 'md' ? 'max-w-lg' : 'max-w-sm')}>
        <div
          className={cn(
            'panel px-5 py-6 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_24px_48px_-28px_rgb(15_23_42/0.22)] sm:px-7 sm:py-7',
            className,
          )}
        >
          <div className="mb-6 space-y-1.5">
            {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
            <h1 className="text-title font-semibold text-foreground">{title}</h1>
            {subtitle ? <div className="text-body text-muted-foreground">{subtitle}</div> : null}
          </div>
          {children}
        </div>
        {footer ? (
          <div className="px-1 text-center text-small text-muted-foreground">{footer}</div>
        ) : null}
      </div>
    </PublicShell>
  );
}
