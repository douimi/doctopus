import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Table({
  className,
  ...props
}: React.ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto" data-slot="table-wrapper">
      <table
        data-slot="table"
        className={cn('w-full text-body caption-bottom', className)}
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
      className={cn(
        'bg-muted [&_tr]:border-b border-border',
        className,
      )}
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
        'border-b border-border transition-colors hover:bg-muted/50',
        className,
      )}
      style={{ transitionDuration: 'var(--duration-fast)' }}
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
        'px-3 py-2.5 text-left text-small uppercase tracking-wide font-medium text-muted-foreground',
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
      className={cn('px-3 py-2.5 align-middle', className)}
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
        className={cn(
          'px-3 py-10 text-center text-muted-foreground text-body',
          className,
        )}
      >
        {children}
      </td>
    </tr>
  );
}
