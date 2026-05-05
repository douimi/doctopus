'use client';

import { useScrollProgress } from './animations';

export function ScrollProgress() {
  const p = useScrollProgress();
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-400 origin-left"
        style={{
          transform: `scaleX(${p})`,
          transition: 'transform 80ms linear',
          opacity: p > 0.001 ? 1 : 0,
        }}
      />
    </div>
  );
}
