'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SidebarNavGroup({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      {label ? <div className="eyebrow mb-1.5 px-2.5">{label}</div> : null}
      {children}
    </div>
  );
}

function under(pathname: string, p: string): boolean {
  return pathname === p || (p !== '/' && pathname.startsWith(p + '/'));
}

/**
 * True when `pathname` is one of `prefixes` or a sub-route, and not under
 * any of `exclude` (e.g. /today but not /today/payments, which has its own
 * entry). Exported for the mobile tab bar so both navs agree.
 */
export function matchesPath(
  pathname: string,
  prefixes: readonly string[],
  exclude: readonly string[] = [],
): boolean {
  return prefixes.some((p) => under(pathname, p)) && !exclude.some((p) => under(pathname, p));
}

export function SidebarNavItem({
  href,
  icon,
  match,
  exclude,
  exact,
  trailing,
  children,
}: {
  href: string;
  icon: ReactNode;
  /** Extra route prefixes that also mark this item active (e.g. /suivis). */
  match?: readonly string[];
  /** Sub-routes that belong to another nav entry. */
  exclude?: readonly string[];
  /** Only active on `href` itself, not its sub-routes (dashboard roots). */
  exact?: boolean;
  /** Right-aligned extra (e.g. an unread badge). */
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : matchesPath(pathname, [href, ...(match ?? [])], exclude);

  return (
    <Link
      href={href}
      data-active={isActive ? '' : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group/nav-item relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-body text-muted-foreground transition-colors duration-(--duration-fast)',
        'hover:bg-muted hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
        'data-active:bg-(--nav-accent-tint) data-active:font-medium data-active:text-foreground',
      )}
    >
      <span
        aria-hidden
        className="absolute -left-2 top-1/2 h-5 w-0.75 -translate-y-1/2 rounded-r-full bg-(--nav-accent) opacity-0 group-data-active/nav-item:opacity-100"
      />
      <span className="inline-flex items-center justify-center text-subtle-foreground transition-colors duration-(--duration-fast) group-hover/nav-item:text-foreground group-data-active/nav-item:text-(--nav-accent)">
        {icon}
      </span>
      <span className="truncate">{children}</span>
      {trailing}
    </Link>
  );
}
