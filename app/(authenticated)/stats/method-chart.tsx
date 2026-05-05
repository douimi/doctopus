'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { RevenueByMethod } from '@/lib/stats/queries';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments/schemas';

const METHOD_COLOR: Record<string, string> = {
  especes: '#0ea5e9',
  carte: '#ea580c',
  cheque: '#f59e0b',
  virement: '#16a34a',
  autre: '#94a3b8',
};

export function MethodChart({ byMethod }: { byMethod: RevenueByMethod }) {
  if (byMethod.length === 0) {
    return <p className="text-small text-muted-foreground p-4">Aucune recette sur la période.</p>;
  }
  const data = byMethod.map((m) => ({
    name: PAYMENT_METHOD_LABELS[m.method as keyof typeof PAYMENT_METHOD_LABELS] ?? m.method,
    method: m.method,
    revenue: Number(m.revenue),
  }));
  return (
    <div className="border rounded-md p-3">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.method} fill={METHOD_COLOR[d.method] ?? '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) =>
              `${Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
