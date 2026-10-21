'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, MoreHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NAV_THEME_VARS, type SidebarTheme } from './sidebar';
import { matchesPath } from './sidebar-nav';

export type MobileTab = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Extra route prefixes that also mark this tab active. */
  match?: readonly string[];
  /** Sub-routes that belong to another tab. */
  exclude?: readonly string[];
};

/**
 * Mobile-only chrome: top bar with hamburger + brand, a slide-in drawer
 * that mirrors the desktop sidebar contents, and (when `tabs` is set) a
 * bottom tab bar for the 2–3 most used routes plus "Plus" (opens the
 * drawer). Renders nothing on md+ (the regular <Sidebar /> handles desktop).
 *
 * The brand/nav/footer slots receive the SAME nodes the desktop sidebar
 * gets — we just render them in two places. Tiny duplication beats
 * threading state through a portal.
 */
export function MobileShell({
  topBarBrand,
  drawerBrand,
  nav,
  footer,
  topBarRight,
  tabs,
  theme = 'sky',
}: {
  /** Compact brand shown in the always-visible mobile top bar (just the lockup). */
  topBarBrand: ReactNode;
  /** Brand shown in the drawer header. Defaults to `topBarBrand`. */
  drawerBrand?: ReactNode;
  /** Sidebar nav items, mirrored from the desktop sidebar. */
  nav: ReactNode;
  /** Sidebar footer (signed-in user block), mirrored from the desktop sidebar. */
  footer: ReactNode;
  /** Right slot in the top bar — typically the notification bell. */
  topBarRight?: ReactNode;
  /** Bottom tab bar entries (keep to 3; "Plus" is appended automatically). */
  tabs?: readonly MobileTab[];
  theme?: SidebarTheme;
}) {
  const pathname = usePathname();
  // The drawer remembers which path it was opened on, so it closes itself
  // on every navigation (the user lands on the new page with the content
  // visible) without a setState-in-effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (v: boolean) => setOpenedOn(v ? pathname : null);

  // Lock body scroll while the drawer is open so the page underneath
  // doesn't drift around behind the overlay; Escape closes it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenedOn(null);
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isTabActive = (t: MobileTab) =>
    matchesPath(pathname, [t.href, ...(t.match ?? [])], t.exclude);
  const anyTabActive = tabs?.some(isTabActive);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/75 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={open}
        >
          <Menu className="size-5" aria-hidden />
        </Button>
        <div className="min-w-0 flex-1">{topBarBrand}</div>
        {topBarRight ? <div className="shrink-0">{topBarRight}</div> : null}
      </header>

      {open ? (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] md:hidden"
            onClick={() => setOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            style={{ ...NAV_THEME_VARS[theme], animation: 'doctopus-drawer-in 200ms ease-out' }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden"
          >
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
              <div className="min-w-0 flex-1">{drawerBrand ?? topBarBrand}</div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                autoFocus
              >
                <X className="size-5" aria-hidden />
              </Button>
            </div>
            <nav aria-label="Navigation principale" className="flex-1 space-y-5 overflow-y-auto px-2 py-3">
              {nav}
            </nav>
            <div className="border-t border-sidebar-border p-2">{footer}</div>
          </aside>
        </>
      ) : null}

      {tabs && tabs.length > 0 ? (
        <nav
          aria-label="Raccourcis"
          style={NAV_THEME_VARS[theme]}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/85 md:hidden"
        >
          <ul className="grid auto-cols-fr grid-flow-col">
            {tabs.map((t) => {
              const active = isTabActive(t);
              return (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    aria-current={active ? 'page' : undefined}
                    data-active={active ? '' : undefined}
                    className={tabClass}
                  >
                    {t.icon}
                    <span className="truncate">{t.label}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Plus de navigation"
                data-active={!anyTabActive ? '' : undefined}
                className={cn(tabClass, 'w-full')}
              >
                <MoreHorizontal className="size-5" aria-hidden />
                <span>Plus</span>
              </button>
            </li>
          </ul>
        </nav>
      ) : null}
    </>
  );
}

const tabClass =
  'flex h-14 flex-col items-center justify-center gap-0.5 px-1 text-micro font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-active:text-(--nav-accent) [&_svg]:size-5';
