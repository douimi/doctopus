import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Segmented control for mutually exclusive views (stats ranges, day
 * pickers, list tabs). Items are links (`aria-current`) or buttons
 * (`aria-pressed`) — deliberately not a tablist, since each option
 * navigates or toggles rather than swapping an in-page panel.
 */
export function SegmentedControl({
  className,
  children,
  label,
}: {
  className?: string;
  children: ReactNode;
  /** Accessible name for the group. */
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-muted p-0.5',
        className,
      )}
    >
      {children}
    </div>
  );
}

const itemClasses =
  'inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-small font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-muted data-active:bg-card data-active:text-foreground data-active:shadow-card';

export function SegmentedControlLink({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      data-active={active ? '' : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(itemClasses, className)}
    >
      {children}
    </Link>
  );
}

export function SegmentedControlButton({
  active,
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'aria-pressed'> & { active: boolean }) {
  return (
    <button
      type="button"
      data-active={active ? '' : undefined}
      aria-pressed={active}
      className={cn(itemClasses, className)}
      {...props}
    />
  );
}
