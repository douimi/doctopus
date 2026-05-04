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
        <div className="text-small uppercase tracking-wide text-muted-foreground px-3 mt-2 mb-1">
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
        'flex items-center gap-2 px-3 py-2 rounded-md text-body transition-colors',
        'border-l-2 border-transparent',
        'hover:bg-muted',
        'data-[active]:bg-[--sidebar-accent-tint] data-[active]:border-l-[--sidebar-accent] data-[active]:font-medium data-[active]:text-foreground',
      )}
      style={{ transitionDuration: 'var(--duration-fast)' }}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
