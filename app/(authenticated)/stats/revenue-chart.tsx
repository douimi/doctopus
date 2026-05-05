'use client';

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

export function RevenueChart({ daily }: { daily: RevenueByDay }) {
  if (daily.length === 0) {
    return <p className="text-small text-muted-foreground p-4">Aucune recette sur la période.</p>;
  }
  const data = daily.map((d) => ({ date: d.date, revenue: Number(d.revenue), count: d.count }));
  return (
    <div className="border rounded-md p-3">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="revenue" name="Recettes (MAD)" fill="#16a34a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
