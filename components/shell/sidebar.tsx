import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SidebarTheme = 'sky' | 'orange';

const THEME_VARS: Record<SidebarTheme, React.CSSProperties> = {
  sky: {
    ['--sidebar-accent' as string]: 'var(--primary)',
    ['--sidebar-accent-tint' as string]: 'var(--primary-tint)',
  },
  orange: {
    ['--sidebar-accent' as string]: 'var(--admin)',
    ['--sidebar-accent-tint' as string]: 'var(--admin-tint)',
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
      style={THEME_VARS[theme]}
      className={cn(
        'hidden md:flex md:flex-col md:w-[220px] md:shrink-0 md:h-screen md:sticky md:top-0',
        'bg-card border-r border-border shadow-card',
        className,
      )}
    >
      <div className="px-4 py-4 border-b border-border">{brand}</div>
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3">{children}</nav>
      <div className="border-t border-border">{footer}</div>
    </aside>
  );
}
