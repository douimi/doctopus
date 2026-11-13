'use client';

import { useState, type ReactNode } from 'react';
import { SegmentedControl, SegmentedControlButton } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

export type BoardColumn = {
  key: string;
  title: string;
  /** Short label for the phone segmented control. */
  shortLabel: string;
  count: number;
  /** Extra header content on the right (e.g. the awaiting total). */
  aside?: ReactNode;
  content: ReactNode;
};

/**
 * Lays out the /today board. The first column is the primary one (the
 * waiting room): from lg it takes the wide left track so patient names
 * and actions have room, and the other columns stack in a narrower right
 * track. Below lg everything stacks in order; on phones one column shows
 * at a time behind a segmented control. Column content is server-rendered
 * and passed in, so realtime refreshes keep working unchanged.
 */
export function BoardColumns({ columns }: { columns: BoardColumn[] }) {
  const [active, setActive] = useState(columns[0]?.key ?? '');
  const [primary, ...secondary] = columns;

  const renderColumn = (c: BoardColumn) => (
    <section
      key={c.key}
      aria-labelledby={`col-${c.key}`}
      className={cn('min-w-0 space-y-3', active === c.key ? 'block' : 'hidden md:block')}
    >
      <header className="flex min-h-8 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id={`col-${c.key}`} className="truncate text-heading font-semibold text-foreground">
            {c.title}
          </h2>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-muted px-1.5 text-micro font-semibold tabular-nums text-muted-foreground">
            {c.count}
          </span>
        </div>
        {c.aside ? <div className="shrink-0 text-small text-muted-foreground">{c.aside}</div> : null}
      </header>
      {c.content}
    </section>
  );

  return (
    <div className="space-y-4">
      <SegmentedControl label="Vue du tableau" className="flex w-full md:hidden">
        {columns.map((c) => (
          <SegmentedControlButton
            key={c.key}
            active={active === c.key}
            onClick={() => setActive(c.key)}
            className="h-9 flex-1 justify-center"
          >
            {c.shortLabel}
            <span className="tabular-nums text-muted-foreground">{c.count}</span>
          </SegmentedControlButton>
        ))}
      </SegmentedControl>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        {primary ? renderColumn(primary) : null}
        {secondary.length > 0 ? (
          <div className="min-w-0 space-y-6">{secondary.map(renderColumn)}</div>
        ) : null}
      </div>
    </div>
  );
}
