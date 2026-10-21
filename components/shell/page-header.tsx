import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PageWidth = 'default' | 'narrow' | 'full';

export const PAGE_WIDTH_CLASS: Record<PageWidth, string> = {
  default: 'max-w-7xl',
  narrow: 'max-w-3xl',
  full: 'max-w-none',
};

/**
 * Page title block. Sits directly on the app canvas (no band, no border).
 * `width` must match the <PageBody width> below it so edges line up.
 * Actions: secondary buttons first, one primary last; never a destructive
 * action next to the primary.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
  width = 'default',
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Single back-link style for detail/form pages. */
  back?: { href: string; label: string };
  width?: PageWidth;
  /** Extra content under the title row (e.g. section tabs). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'mx-auto w-full px-4 pt-6 pb-2 md:px-8 md:pt-8',
        PAGE_WIDTH_CLASS[width],
        className,
      )}
    >
      {back ? (
        <Link
          href={back.href}
          className="mb-2 -ml-1 inline-flex items-center gap-1 rounded-sm pr-1 text-small font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1">
          {eyebrow ? <p className="eyebrow first-letter:capitalize">{eyebrow}</p> : null}
          <h1 className="text-display font-semibold text-pretty text-foreground">{title}</h1>
          {description ? (
            <div className="max-w-prose text-body text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}
