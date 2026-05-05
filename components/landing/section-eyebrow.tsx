'use client';

import type { ReactNode } from 'react';

/**
 * Section number / label rendered with a distinct reveal animation:
 * a thin sky-colored line draws in from the left as the eyebrow text
 * fades up. Driven by the parent SectionFrame's `revealed` flag.
 */
export function SectionEyebrow({
  revealed,
  children,
}: {
  revealed: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        aria-hidden
        className="block h-px bg-sky-400/60 origin-left transition-transform duration-700 ease-out"
        style={{
          width: '3rem',
          transform: revealed ? 'scaleX(1)' : 'scaleX(0)',
        }}
      />
      <span
        className="text-sky-400 text-[13px] uppercase tracking-[0.1em] font-semibold transition-all duration-700 ease-out"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(8px)',
          transitionDelay: revealed ? '120ms' : '0ms',
        }}
      >
        {children}
      </span>
    </div>
  );
}
