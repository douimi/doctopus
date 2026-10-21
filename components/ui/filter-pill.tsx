import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Linked filter pill used in list filters across the app (admin tenants,
 * consultation tabs, …). Active = soft primary tint. For mutually
 * exclusive *views* (date ranges) prefer <SegmentedControl />.
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
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-pill border px-3 text-small font-medium transition-colors duration-(--duration-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? 'border-primary/30 bg-primary-tint text-primary-ink'
          : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
        className,
      )}
    >
      {children}
    </Link>
  );
}
