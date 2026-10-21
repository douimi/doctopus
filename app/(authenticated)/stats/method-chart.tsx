'use client';

import { Wallet } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { RevenueByMethod } from '@/lib/stats/queries';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments/schemas';
import { EmptyState } from '@/components/ui/empty-state';
import { useChartTokens, type ChartTokens } from '@/lib/charts/tokens';
import { ChartPanel, tooltipContentStyle } from './chart-style';

// Categorical palette in a fixed order per method, so a method keeps its
// colour whichever ones appear in the period.
function methodColor(method: string, t: ChartTokens): string {
  switch (method) {
    case 'especes':
      return t['--chart-1'];
    case 'carte':
      return t['--chart-2'];
    case 'cheque':
      return t['--chart-3'];
    case 'virement':
      return t['--chart-4'];
    default:
      return t['--chart-5'];
  }
}

export function MethodChart({ byMethod }: { byMethod: RevenueByMethod }) {
  const tokens = useChartTokens();
  if (byMethod.length === 0) {
    return (
      <div className="panel">
        <EmptyState
          icon={Wallet}
          title="Aucun encaissement"
          description="Aucun paiement encaissé sur la période sélectionnée."
        />
      </div>
    );
  }
  const data = byMethod.map((m) => ({
    name: PAYMENT_METHOD_LABELS[m.method as keyof typeof PAYMENT_METHOD_LABELS] ?? m.method,
    method: m.method,
    revenue: Number(m.revenue),
  }));
  return (
    <ChartPanel>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            stroke={tokens['--border']}
          >
            {data.map((d) => (
              <Cell key={d.method} fill={methodColor(d.method, tokens)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipContentStyle}
            formatter={(v) =>
              `${Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`
            }
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
