'use client';

import { Activity } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '@/components/ui/empty-state';
import { useChartTokens } from '@/lib/charts/tokens';

type DailyPoint = { date: string; consumed: number; costMicrousd: number };

export function UsageChart({ daily }: { daily: DailyPoint[] }) {
  const tokens = useChartTokens();
  const data = daily.map((d) => ({
    date: d.date,
    consumed: d.consumed,
    costMad: (d.costMicrousd / 1_000_000) * 10, // microUSD → USD → MAD (10 MAD/USD)
  }));
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Pas encore d'utilisation IA"
        description="Aucun appel enregistré ce mois-ci."
      />
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-3">
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={tokens['--border']} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={tokens['--muted-foreground']} />
          <YAxis yAxisId="l" tick={{ fontSize: 11 }} stroke={tokens['--muted-foreground']} />
          <YAxis
            yAxisId="r"
            orientation="right"
            tick={{ fontSize: 11 }}
            stroke={tokens['--muted-foreground']}
          />
          <Tooltip />
          <Area
            yAxisId="l"
            type="monotone"
            dataKey="consumed"
            name="Consultations IA"
            stroke={tokens['--primary']}
            fill={tokens['--primary-tint']}
            strokeWidth={2}
          />
          <Line
            yAxisId="r"
            type="monotone"
            dataKey="costMad"
            name="Coût (MAD)"
            stroke={tokens['--admin']}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
