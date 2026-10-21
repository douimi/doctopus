import { FilterPill } from '@/components/ui/filter-pill';
import type { StatsRange } from '@/lib/time';

const LABELS: Record<StatsRange, string> = {
  today: "Aujourd'hui",
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
};

const RANGES: StatsRange[] = ['today', '7d', '30d', '90d'];

/** `active === 'month'` is the calendar-month comparison view (default). */
export function RangePills({ active }: { active: StatsRange | 'month' }) {
  return (
    <div role="tablist" aria-label="Plage de temps" className="inline-flex flex-wrap gap-1">
      <FilterPill href="/stats" active={active === 'month'}>
        Par mois
      </FilterPill>
      {RANGES.map((r) => (
        <FilterPill key={r} href={`/stats?range=${r}`} active={r === active}>
          {LABELS[r]}
        </FilterPill>
      ))}
    </div>
  );
}
