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
 * Lays out the /today columns: three side by side from xl, stacked in
 * the same (role-dependent) order below, and one at a time behind a
 * segmented control on phones. Column content is server-rendered and
 * passed in, so realtime refreshes keep working unchanged.
 */
export function BoardColumns({ columns }: { columns: BoardColumn[] }) {
  const [active, setActive] = useState(columns[0]?.key ?? '');

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

      <div className="grid gap-6 xl:grid-cols-3 xl:items-start">
        {columns.map((c) => (
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
        ))}
      </div>
    </div>
  );
}
