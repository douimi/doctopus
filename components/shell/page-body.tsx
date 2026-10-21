import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PAGE_WIDTH_CLASS, type PageWidth } from './page-header';

/**
 * Standard page content wrapper: same gutter and max width as PageHeader,
 * `space-y-6` between sections.
 */
export function PageBody({
  width = 'default',
  className,
  children,
}: {
  width?: PageWidth;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full space-y-6 px-4 pt-4 pb-12 md:px-8',
        PAGE_WIDTH_CLASS[width],
        className,
      )}
    >
      {children}
    </div>
  );
}
