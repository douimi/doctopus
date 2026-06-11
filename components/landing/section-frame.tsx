'use client';

import type { ReactNode } from 'react';
import { useReveal } from './animations';
import { cn } from '@/lib/utils';

/**
 * Generic full-screen section with reveal-on-scroll. Children are
 * rendered inside a container that fades + slides up when the section
 * crosses 20% into the viewport. The reveal flag is also passed to a
 * render-prop so child mockups can trigger their own typewriter / count-up
 * animations.
 */
export function SectionFrame({
  id,
  children,
  className,
}: {
  /** Optional DOM id for in-page navigation. */
  id?: string;
  children: ((revealed: boolean) => ReactNode) | ReactNode;
  className?: string;
}) {
  const { ref, revealed } = useReveal<HTMLElement>();
  const content = typeof children === 'function' ? children(revealed) : children;
  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        'min-h-screen px-8 py-32 flex flex-col items-center justify-center max-w-[1200px] mx-auto',
        className,
      )}
    >
      <div
        className={cn(
          'w-full flex flex-col items-center transition-all duration-700 ease-out',
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        )}
      >
        {content}
      </div>
    </section>
  );
}
