'use client';

import { TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '@/components/ui/empty-state';
import { useChartTokens } from '@/lib/charts/tokens';
import { formatMad } from '@/lib/medications/format';
import {
  ChartPanel,
  axisProps,
  gridProps,
  tooltipContentStyle,
  tooltipLabelStyle,
} from './chart-style';

export type CumulativePoint = { day: number; current: number | null; compare: number | null };

/**
 * Running revenue total by day of month, displayed month vs the
 * comparison month. Answers "are we ahead of last month at this point?"
 * better than side-by-side daily bars, which are noisy day to day.
 */
export function CumulativeChart({
  data,
  currentLabel,
  compareLabel,
}: {
  data: CumulativePoint[];
  currentLabel: string;
  compareLabel: string;
}) {
  const t = useChartTokens();
  const hasData = data.some((d) => (d.current ?? 0) > 0 || (d.compare ?? 0) > 0);
  if (!hasData) {
    return (
      <div className="panel">
        <EmptyState
          icon={TrendingUp}
          title="Aucune recette"
          description="Aucune recette enregistrée sur ces deux mois."
        />
      </div>
    );
  }
  return (
    <ChartPanel>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps(t)} />
          <XAxis dataKey="day" {...axisProps(t)} />
          <YAxis {...axisProps(t)} width={56} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            labelFormatter={(d) => `Jour ${d}`}
            formatter={(v) => (typeof v === 'number' ? formatMad(String(v)) : String(v))}
          />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)', textTransform: 'capitalize' }}
          />
          <Line
            type="monotone"
            dataKey="compare"
            name={compareLabel}
            stroke={t['--muted-foreground']}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="current"
            name={currentLabel}
            stroke={t['--primary']}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
