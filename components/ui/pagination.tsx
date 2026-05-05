import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Page-link pagination renderable in a server component.
 * `buildHref(page)` returns the link target for the given 1-indexed page —
 * caller decides which query params to keep (search, filter, etc.).
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
  className,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const pages = pageNumbers(page, totalPages);

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-4', className)}
    >
      <span className="text-small text-muted-foreground tabular-nums">
        Page {page} sur {totalPages}
      </span>
      <ul className="flex items-center gap-1">
        <li>
          <PaginationButton
            href={buildHref(Math.max(1, page - 1))}
            disabled={page <= 1}
            ariaLabel="Page précédente"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </PaginationButton>
        </li>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <li key={`ellipsis-${i}`} aria-hidden className="px-2 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={p}>
              <PaginationButton
                href={buildHref(p)}
                active={p === page}
                ariaLabel={`Page ${p}`}
              >
                <span className="tabular-nums">{p}</span>
              </PaginationButton>
            </li>
          ),
        )}
        <li>
          <PaginationButton
            href={buildHref(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            ariaLabel="Page suivante"
          >
            <ChevronRight className="size-4" aria-hidden />
          </PaginationButton>
        </li>
      </ul>
    </nav>
  );
}

function PaginationButton({
  href,
  active,
  disabled,
  ariaLabel,
  children,
}: {
  href: string;
  active?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        aria-label={ariaLabel}
        className="inline-flex items-center justify-center min-w-9 h-9 px-2.5 rounded-md text-small border border-border bg-card text-muted-foreground/50 cursor-not-allowed"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center justify-center min-w-9 h-9 px-2.5 rounded-md border text-small transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
        active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-card text-foreground border-border hover:bg-muted',
      )}
      style={{ transitionDuration: 'var(--duration-fast)' }}
    >
      {children}
    </Link>
  );
}

/** Build the page list with at most 7 entries — adds ellipses around the current page. */
function pageNumbers(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: Array<number | 'ellipsis'> = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) out.push('ellipsis');
  for (let p = left; p <= right; p += 1) out.push(p);
  if (right < total - 1) out.push('ellipsis');
  out.push(total);
  return out;
}
