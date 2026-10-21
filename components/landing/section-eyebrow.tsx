import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Small uppercase section label (landing-sized version of the app's
 * `eyebrow`): sky-700 on white = 5.9:1. Static: no reveal animation.
 */
export function SectionEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'mb-3 inline-flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-sky-700',
        className,
      )}
    >
      <span aria-hidden className="block h-px w-6 bg-sky-600/70" />
      {children}
    </p>
  );
}
