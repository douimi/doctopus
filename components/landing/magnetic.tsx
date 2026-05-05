'use client';

import type { ReactNode } from 'react';
import { useMagnetic } from './animations';

/**
 * Wraps a child element (link, button, etc.) and applies a magnetic
 * cursor-tracked translation on hover. Falls back to no-op under
 * prefers-reduced-motion.
 */
export function Magnetic({
  children,
  strength = 0.3,
  max = 10,
  className,
}: {
  children: ReactNode;
  strength?: number;
  max?: number;
  className?: string;
}) {
  const { onMouseMove, onMouseLeave, style } = useMagnetic(strength, max);
  return (
    <span
      className={className}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={style}
    >
      {children}
    </span>
  );
}
