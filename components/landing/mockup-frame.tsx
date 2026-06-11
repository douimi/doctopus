'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared device-frame for every landing-page mockup. Replaces the old
 * per-mockup chrome (macOS-style traffic-light dots + gradient bezel)
 * with a clean rounded zinc frame that visually matches the
 * ContainerScroll showcase up top — single dark surface, subtle inner
 * border, soft drop shadow.
 *
 * Each mockup renders only its body now; sections wrap it in this frame.
 */
export function MockupFrame({
  children,
  className,
  size = 'wide',
}: {
  children: ReactNode;
  className?: string;
  /** `wide` = 900px (default), `narrow` = xl. */
  size?: 'wide' | 'narrow';
}) {
  return (
    <div
      className={cn(
        'mt-10 md:mt-12 mx-auto w-full',
        size === 'narrow' ? 'max-w-xl' : 'max-w-[900px]',
        'bg-zinc-900 border border-zinc-700/50 rounded-2xl p-1.5',
        'shadow-[0_30px_70px_-20px_rgba(0,0,0,0.55)]',
        className,
      )}
    >
      <div className="rounded-[14px] overflow-hidden">{children}</div>
    </div>
  );
}
