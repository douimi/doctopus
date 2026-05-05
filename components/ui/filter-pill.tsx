import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Linked filter pill used in list filters across the app
 * (admin tenants, stats range, …). Active state inverts foreground
 * vs background; inactive lives on the muted card surface.
 */
export function FilterPill({
  href,
  active,
  children,
  className,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'px-2.5 py-1 rounded-pill border text-small transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
        active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground',
        className,
      )}
      style={{ transitionDuration: 'var(--duration-fast)' }}
    >
      {children}
    </Link>
  );
}
