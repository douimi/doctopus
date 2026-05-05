import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { StatsRange } from '@/lib/time';

const LABELS: Record<StatsRange, string> = {
  today: "Aujourd'hui",
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
};

const RANGES: StatsRange[] = ['today', '7d', '30d', '90d'];

export function RangePills({ active }: { active: StatsRange }) {
  return (
    <div role="tablist" aria-label="Plage de temps" className="inline-flex gap-1">
      {RANGES.map((r) => (
        <Link
          key={r}
          href={`/stats?range=${r}`}
          role="tab"
          aria-selected={r === active}
          className={cn(
            'px-3 py-1.5 rounded-pill border text-small transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
            r === active
              ? 'bg-foreground text-background border-foreground'
              : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground',
          )}
          style={{ transitionDuration: 'var(--duration-fast)' }}
        >
          {LABELS[r]}
        </Link>
      ))}
    </div>
  );
}
