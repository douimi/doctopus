'use client';

import type { ReactNode } from 'react';
import { useParallax } from './animations';

/**
 * Wraps a child in a div that translates vertically based on its
 * distance from the viewport center. Used to give cinematic mockups
 * a slight parallax pull as the user scrolls past them.
 */
export function Parallax({
  children,
  strength = 0.06,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const { ref, style } = useParallax<HTMLDivElement>(strength);
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
