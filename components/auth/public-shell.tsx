import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandLockup } from '@/components/ui/brand';
import { cn } from '@/lib/utils';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Frame for public pages (sign-in, invitations, legal pages). Shares the
 * landing's light surface and logo so leaving the marketing site doesn't
 * feel like switching products, but stays still: no motion, no gradients
 * on the content itself.
 */
export function PublicShell({
  children,
  headerAction,
  align = 'center',
  className,
}: {
  children: ReactNode;
  /** Right side of the top bar. Defaults to a "back to site" link. */
  headerAction?: ReactNode;
  /** `center` for auth cards, `top` for reading pages. */
  align?: 'center' | 'top';
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas bg-landing-surface text-foreground">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-4 py-2 md:px-8">
        <Link href="/" aria-label="Doctopus, retour à l'accueil" className={cn('rounded-md', FOCUS)}>
          <BrandLockup size={64} />
        </Link>
        {headerAction === undefined ? (
          <Link
            href="/"
            className={cn(
              'rounded-lg px-3 py-1.5 text-small font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-card hover:text-foreground',
              FOCUS,
            )}
          >
            Retour au site
          </Link>
        ) : (
          headerAction
        )}
      </header>

      <main
        className={cn(
          'flex flex-1 justify-center px-4 pb-12 pt-2 sm:pt-6',
          align === 'center' ? 'items-start sm:items-center' : 'items-start',
          className,
        )}
      >
        {children}
      </main>

      <footer className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pb-6 text-small text-muted-foreground md:px-8">
        <span>© {new Date().getFullYear()} Doctopus</span>
        <span aria-hidden className="text-subtle-foreground">
          ·
        </span>
        <span>Conçu au Maroc</span>
        <span aria-hidden className="text-subtle-foreground">
          ·
        </span>
        <Link
          href="/static/sous-traitants"
          className={cn('rounded-sm hover:text-foreground hover:underline underline-offset-4', FOCUS)}
        >
          Sous-traitants
        </Link>
      </footer>
    </div>
  );
}
