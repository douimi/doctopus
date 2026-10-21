import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Plain table primitives. Wrap in `<div className="panel overflow-hidden">`
 * for the bordered surface. `density="compact"` tightens rows (stats tables).
 */
export function Table({
  className,
  density = 'comfortable',
  ...props
}: React.ComponentProps<'table'> & { density?: 'comfortable' | 'compact' }) {
  return (
    <div className="relative w-full overflow-x-auto" data-slot="table-wrapper">
      <table
        data-slot="table"
        data-density={density}
        className={cn('w-full caption-bottom text-body', className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('bg-canvas [&_tr]:border-b [&_tr]:border-border', className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-border transition-colors duration-(--duration-fast) hover:bg-muted/50 data-[state=selected]:bg-primary-tint',
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'eyebrow h-10 px-4 text-left align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('px-4 py-3 align-middle in-data-[density=compact]:py-2', className)}
      {...props}
    />
  );
}

export function TableEmpty({
  colSpan,
  children,
  className,
}: {
  colSpan: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr data-slot="table-empty">
      <td
        colSpan={colSpan}
        className={cn('px-4 py-12 text-center text-body text-muted-foreground', className)}
      >
        {children}
      </td>
    </tr>
  );
}
