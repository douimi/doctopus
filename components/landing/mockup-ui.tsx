import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/*
 * Tiny visual primitives for the landing mockups, sized like the
 * redesigned app (13px meta, 11px eyebrow labels, white panels on a
 * slate-50 canvas, colour only for state). Purely presentational and
 * always rendered inside an aria-hidden MockupFrame.
 */

export function MPanel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white', className)}>{children}</div>
  );
}

export function MLabel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500',
        className,
      )}
    >
      {children}
    </div>
  );
}

type Tone = 'neutral' | 'danger' | 'success' | 'warning' | 'info';

const CHIP: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  danger: 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-200',
  success: 'bg-emerald-50 text-emerald-800',
  warning: 'bg-amber-50 text-amber-800',
  info: 'bg-sky-50 text-sky-800',
};

export function MChip({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium',
        CHIP[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function MButton({
  variant = 'primary',
  className,
  children,
}: {
  variant?: 'primary' | 'outline';
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md px-2.5 text-[11.5px] font-medium',
        variant === 'primary'
          ? 'bg-sky-700 text-white'
          : 'border border-slate-300 bg-white text-slate-700',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function MAvatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600',
        className,
      )}
    >
      {initials}
    </span>
  );
}

/** Blinking caret for typewriter fields (static under reduced motion). */
export function Caret({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="ml-px inline-block h-[1em] w-px translate-y-[2px] bg-slate-500 motion-safe:animate-pulse" />;
}
