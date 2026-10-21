import { SegmentedControl, SegmentedControlLink } from '@/components/ui/segmented-control';
import type { StatsRange } from '@/lib/time';

const LABELS: Record<StatsRange, string> = {
  today: "Aujourd'hui",
  '7d': '7 jours',
  '30d': '30 jours',
  '90d': '90 jours',
};

const RANGES: StatsRange[] = ['today', '7d', '30d', '90d'];

/** `active === 'month'` is the calendar-month comparison view (default). */
export function RangePills({ active }: { active: StatsRange | 'month' }) {
  return (
    <SegmentedControl label="Plage de temps">
      <SegmentedControlLink href="/stats" active={active === 'month'}>
        Par mois
      </SegmentedControlLink>
      {RANGES.map((r) => (
        <SegmentedControlLink key={r} href={`/stats?range=${r}`} active={r === active}>
          {LABELS[r]}
        </SegmentedControlLink>
      ))}
    </SegmentedControl>
  );
}
