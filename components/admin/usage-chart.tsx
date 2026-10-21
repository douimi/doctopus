'use client';

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

const MAD_PER_USD = 10;

function fmtDay(iso: string): string {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Daily AI usage: consultations (area, left axis) and estimated cost in
 * MAD (line, right axis). Renders bare — the caller provides the panel.
 */
export function UsageChart({ daily }: { daily: DailyPoint[] }) {
  const tokens = useChartTokens();
  const data = daily.map((d) => ({
    date: d.date,
    consumed: d.consumed,
    costMad: Math.round((d.costMicrousd / 1_000_000) * MAD_PER_USD * 100) / 100,
  }));
  if (data.length === 0) {
    return (
      <EmptyState
        size="sm"
        title="Pas encore d'utilisation IA"
        description="Aucun appel à l'assistant IA sur les 30 derniers jours."
      />
    );
  }
  const tick = { fontSize: 12, fill: tokens['--muted-foreground'] };
  return (
    <div
      role="img"
      aria-label={`Activité IA quotidienne sur ${data.length} jours : consultations et coût estimé en MAD.`}
    >
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={tokens['--border']} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDay}
            tick={tick}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis yAxisId="l" tick={tick} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis
            yAxisId="r"
            orientation="right"
            tick={tick}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            labelFormatter={(label) => fmtDay(String(label))}
            formatter={(value, name) =>
              name === 'Coût (MAD)'
                ? [`${Number(value).toFixed(2)} MAD`, name]
                : [String(value), name]
            }
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-popover)',
              fontSize: 13,
            }}
          />
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
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full" style={{ background: tokens['--primary'] }} />
          Consultations IA
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full" style={{ background: tokens['--admin'] }} />
          Coût estimé (MAD)
        </span>
      </div>
    </div>
  );
}
