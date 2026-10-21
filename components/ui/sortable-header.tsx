import Link from 'next/link';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SortDir = 'asc' | 'desc';

/**
 * Column header that doubles as a sort toggle. Each table builds its
 * own `href` (with whatever query params it tracks) and tells us
 * whether this column is currently active and which direction. Inactive
 * columns show a faded up/down chevron as the affordance.
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
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;
  return (
    <Link
      href={href}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(
        'inline-flex items-center gap-1 -mx-1 px-1 rounded-sm transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active && 'text-foreground',
        className,
      )}
    >
      {children}
      <Icon
        className={cn('size-3', active ? 'text-foreground' : 'opacity-40')}
        aria-hidden
      />
    </Link>
  );
}
