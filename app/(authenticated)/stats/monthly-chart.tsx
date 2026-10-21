'use client';

import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartTokens } from '@/lib/charts/tokens';
import { formatMad } from '@/lib/medications/format';

export type MonthlyBar = { key: string; label: string; revenue: number };

/**
 * Revenue for the last 12 months. The displayed month is solid primary,
 * the comparison month muted-dark, every other month a light tint, so the
 * two months being compared stand out. Clicking a bar opens that month.
 */
export function MonthlyChart({
  data,
  selected,
  compare,
}: {
  data: MonthlyBar[];
  selected: string | null;
  compare: string | null;
}) {
  const t = useChartTokens();
  const router = useRouter();
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-3">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={t['--border']} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke={t['--muted-foreground']} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke={t['--muted-foreground']}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            cursor={{ fill: t['--muted'] }}
            formatter={(v) => (typeof v === 'number' ? formatMad(String(v)) : String(v))}
          />
          <Bar
            dataKey="revenue"
            name="Recettes"
            radius={[4, 4, 0, 0]}
            className="cursor-pointer"
            onClick={(d) => {
              const key = (d as { payload?: MonthlyBar }).payload?.key;
              if (key) router.push(`/stats?month=${key}`);
            }}
          >
            {data.map((d) => (
              <Cell
                key={d.key}
                fill={
                  d.key === selected
                    ? t['--primary']
                    : d.key === compare
                      ? t['--muted-foreground']
                      : t['--primary-tint']
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
