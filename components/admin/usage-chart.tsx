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

type DailyPoint = { date: string; consumed: number; costMicrousd: number };

export function UsageChart({ daily }: { daily: DailyPoint[] }) {
  const data = daily.map((d) => ({
    date: d.date,
    consumed: d.consumed,
    costMad: (d.costMicrousd / 1_000_000) * 10, // microUSD → USD → MAD (10 MAD/USD)
  }));
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-500 p-4">
        Pas encore d&apos;utilisation IA ce mois-ci.
      </p>
    );
  }
  return (
    <div className="border rounded-md p-3">
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Area
            yAxisId="l"
            type="monotone"
            dataKey="consumed"
            name="Consultations IA"
            stroke="#2563eb"
            fill="#dbeafe"
            strokeWidth={2}
          />
          <Line
            yAxisId="r"
            type="monotone"
            dataKey="costMad"
            name="Coût (MAD)"
            stroke="#ea580c"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
