import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SidebarTheme = 'sky' | 'orange';

// Nav accent vars consumed by SidebarNavItem via `bg-(--nav-accent)`.
// Named --nav-* so they don't clobber shadcn's own --sidebar-accent token.
export const NAV_THEME_VARS: Record<SidebarTheme, React.CSSProperties> = {
  sky: {
    ['--nav-accent' as string]: 'var(--primary)',
    ['--nav-accent-tint' as string]: 'var(--primary-tint)',
  },
  orange: {
    ['--nav-accent' as string]: 'var(--admin)',
    ['--nav-accent-tint' as string]: 'var(--admin-tint)',
  },
};

export function Sidebar({
  theme,
  brand,
  children,
  footer,
  className,
}: {
  theme: SidebarTheme;
  brand: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  className?: string;
}) {
  return (
    <aside
      data-slot="sidebar"
      data-theme={theme}
      style={NAV_THEME_VARS[theme]}
      className={cn(
        'hidden md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:shrink-0 md:flex-col',
        'border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        className,
      )}
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        {brand}
      </div>
      <nav aria-label="Navigation principale" className="flex-1 space-y-5 overflow-y-auto px-2 py-3">
        {children}
      </nav>
      <div className="border-t border-sidebar-border p-2">{footer}</div>
    </aside>
  );
}
