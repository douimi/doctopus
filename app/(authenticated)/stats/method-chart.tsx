'use client';

import { Wallet } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { RevenueByMethod } from '@/lib/stats/queries';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments/schemas';
import { EmptyState } from '@/components/ui/empty-state';
import { useChartTokens, type ChartTokens } from '@/lib/charts/tokens';

function methodColor(method: string, t: ChartTokens): string {
  switch (method) {
    case 'especes':
      return t['--primary'];
    case 'carte':
      return t['--admin'];
    case 'cheque':
      return t['--warning'];
    case 'virement':
      return t['--success'];
    default:
      return t['--muted-foreground'];
  }
}

export function MethodChart({ byMethod }: { byMethod: RevenueByMethod }) {
  const tokens = useChartTokens();
  if (byMethod.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Aucun encaissement"
        description="Aucun paiement encaissé sur la période sélectionnée."
      />
    );
  }
  const data = byMethod.map((m) => ({
    name: PAYMENT_METHOD_LABELS[m.method as keyof typeof PAYMENT_METHOD_LABELS] ?? m.method,
    method: m.method,
    revenue: Number(m.revenue),
  }));
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-3">
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
              <Cell key={d.method} fill={methodColor(d.method, tokens)} />
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
