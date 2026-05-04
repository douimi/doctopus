import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export function PageBreadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div
      className={cn(
        'px-6 py-3 border-b border-border bg-card',
        className,
      )}
    >
      <ol className="flex items-center gap-1 text-small text-muted-foreground">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                  style={{ transitionDuration: 'var(--duration-fast)' }}
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast ? 'text-foreground font-medium' : '')}>
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight className="size-3 text-muted-foreground" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
