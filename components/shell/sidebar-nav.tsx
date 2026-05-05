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
      {label ? (
        <div className="text-small uppercase tracking-wider text-muted-foreground/80 font-medium px-3 mt-3 mb-1.5">
          {label}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function SidebarNavItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive =
    href === pathname ||
    (href !== '/' && pathname.startsWith(href + '/')) ||
    (href !== '/' && pathname === href);

  return (
    <Link
      href={href}
      data-active={isActive ? '' : undefined}
      className={cn(
        'group/nav-item relative flex items-center gap-2.5 mx-1 px-2.5 py-2 rounded-md text-body text-foreground/80 transition-all',
        'hover:bg-muted hover:text-foreground hover:translate-x-0.5',
        'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
        'data-[active]:bg-[--sidebar-accent-tint] data-[active]:text-foreground data-[active]:font-medium',
      )}
      style={{ transitionDuration: 'var(--duration-fast)' }}
      aria-current={isActive ? 'page' : undefined}
    >
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-pill bg-[--sidebar-accent] transition-all',
          'opacity-0 -translate-x-1',
          'group-data-[active]/nav-item:opacity-100 group-data-[active]/nav-item:translate-x-0',
        )}
        style={{ transitionDuration: 'var(--duration-fast)' }}
      />
      <span
        className={cn(
          'inline-flex items-center justify-center text-muted-foreground transition-colors',
          'group-hover/nav-item:text-foreground',
          'group-data-[active]/nav-item:text-[--sidebar-accent]',
        )}
        style={{ transitionDuration: 'var(--duration-fast)' }}
      >
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </Link>
  );
}
