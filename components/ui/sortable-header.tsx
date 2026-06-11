import Link from 'next/link';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SortDir = 'asc' | 'desc';

/**
 * Column header that doubles as a sort toggle. Each table builds its
 * own `href` (with whatever query params it tracks) and tells us
 * whether this column is currently active and which direction. The
 * little arrow icon snaps to the active dir; inactive columns show a
 * faded ↑ as the affordance.
 */
export function SortableHeader({
  href,
  active,
  dir,
  children,
  className,
}: {
  href: string;
  active: boolean;
  dir?: SortDir;
  children: ReactNode;
  className?: string;
}) {
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUp;
  return (
    <Link
      href={href}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(
        'inline-flex items-center gap-1 -mx-1 px-1 rounded hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
        className,
      )}
      style={{ transitionDuration: 'var(--duration-fast)' }}
    >
      {children}
      <Icon
        className={cn('size-3', active ? 'opacity-90' : 'opacity-30')}
        aria-hidden
      />
    </Link>
  );
}
