'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

/**
 * Mobile-only chrome: top bar with hamburger + brand, plus a slide-in
 * drawer that mirrors the desktop sidebar contents. Renders nothing on
 * md+ (the regular <Sidebar /> handles desktop).
 *
 * The brand/nav/footer slots receive the SAME nodes the desktop sidebar
 * gets — we just render them in two places. Tiny duplication beats
 * threading state through a portal.
 */
export function MobileShell({
  topBarBrand,
  nav,
  footer,
  topBarRight,
}: {
  /** Compact brand shown in the always-visible mobile top bar (just the lockup). */
  topBarBrand: ReactNode;
  /** Sidebar nav items, mirrored from the desktop sidebar. */
  nav: ReactNode;
  /** Sidebar footer (signed-in user block), mirrored from the desktop sidebar. */
  footer: ReactNode;
  /** Right slot in the top bar — typically the notification bell. */
  topBarRight?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close the drawer on every navigation so the user lands on the
  // new page with the content visible.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open so the page underneath
  // doesn't drift around behind the overlay.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-2 px-3 h-14 border-b border-border bg-card">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="inline-flex items-center justify-center size-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          style={{ transitionDuration: 'var(--duration-fast)' }}
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <div className="flex-1 min-w-0">{topBarBrand}</div>
        {topBarRight ? <div className="shrink-0">{topBarRight}</div> : null}
      </header>

      {open ? (
        <>
          <div
            aria-hidden
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-card border-r border-border flex flex-col"
            style={{ animation: 'doctopus-drawer-in 200ms ease-out' }}
          >
            <div className="px-3 h-14 border-b border-border flex items-center justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="inline-flex items-center justify-center size-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                style={{ transitionDuration: 'var(--duration-fast)' }}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-1 py-3 space-y-3">{nav}</nav>
            <div className="border-t border-border">{footer}</div>
          </aside>
        </>
      ) : null}
    </>
  );
}
