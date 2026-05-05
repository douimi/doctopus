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

export function RevenueChart({ daily }: { daily: RevenueByDay }) {
  const tokens = useChartTokens();
  if (daily.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Aucune recette"
        description="Aucune recette enregistrée sur la période sélectionnée."
      />
    );
  }
  const data = daily.map((d) => ({ date: d.date, revenue: Number(d.revenue), count: d.count }));
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-3">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={tokens['--border']} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={tokens['--muted-foreground']} />
          <YAxis tick={{ fontSize: 11 }} stroke={tokens['--muted-foreground']} />
          <Tooltip />
          <Bar
            dataKey="revenue"
            name="Recettes (MAD)"
            fill={tokens['--success']}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
