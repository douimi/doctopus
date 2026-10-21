'use client';

import { TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RevenueByDay } from '@/lib/stats/queries';
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

function fmtDay(iso: string): string {
  const [, m, d] = iso.split('-');
  return d && m ? `${d}/${m}` : iso;
}

export function RevenueChart({ daily }: { daily: RevenueByDay }) {
  const tokens = useChartTokens();
  if (daily.length === 0) {
    return (
      <div className="panel">
        <EmptyState
          icon={TrendingUp}
          title="Aucune recette"
          description="Aucune recette enregistrée sur la période sélectionnée."
        />
      </div>
    );
  }
  const data = daily.map((d) => ({ date: d.date, revenue: Number(d.revenue), count: d.count }));
  const total = data.reduce((s, d) => s + d.revenue, 0);
  return (
    <ChartPanel label="Total sur la période" total={formatMad(String(total))}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps(tokens)} />
          <XAxis dataKey="date" tickFormatter={fmtDay} {...axisProps(tokens)} />
          <YAxis {...axisProps(tokens)} width={56} />
          <Tooltip
            cursor={{ fill: tokens['--muted'] }}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            labelFormatter={(d) => fmtDay(String(d))}
            formatter={(v) => (typeof v === 'number' ? formatMad(String(v)) : String(v))}
          />
          {/* Revenue is a neutral fact: brand blue, not "success" green. */}
          <Bar dataKey="revenue" name="Recettes" fill={tokens['--primary']} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
