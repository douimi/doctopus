import { getGlobalUsageReport } from '@/lib/admin/queries';
import { StatCard } from '@/components/admin/stat-card';
import { UsageChart } from '@/components/admin/usage-chart';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PROVIDER_LABEL: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  mistral: 'Mistral',
};

export default async function AdminDashboardPage() {
  const r = await getGlobalUsageReport(30);
  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-xl font-semibold">Tableau de bord</h1>
      <p className="text-xs text-muted-foreground">30 derniers jours</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Cabinets actifs" value={String(r.activeTenants)} />
        <StatCard label="Crédits consommés" value={String(r.creditsConsumed30d)} hint="(débits)" />
        <StatCard
          label="Coût IA estimé"
          value={`$${r.estCostUsd30d.toFixed(2)}`}
          hint={`≈ ${(r.estCostUsd30d * 10).toFixed(2)} MAD`}
        />
        <StatCard
          label="Marge estimée"
          value={`${r.estMarginMad30d.toFixed(2)} MAD`}
          hint={`${r.marginPct}% sur ${r.estRevenueMad30d.toFixed(2)} MAD`}
        />
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Activité quotidienne</h2>
        <UsageChart daily={r.daily} />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Par fournisseur</h2>
        <div className="border border-border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Cabinets</TableHead>
                <TableHead>Crédits</TableHead>
                <TableHead>Tokens (in/out)</TableHead>
                <TableHead>Coût USD</TableHead>
                <TableHead>Revenu MAD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.perProvider.length === 0 ? (
                <TableEmpty colSpan={6}>
                  <EmptyState icon={BarChart3} title="Pas encore d'utilisation IA ce mois-ci." />
                </TableEmpty>
              ) : (
                r.perProvider.map((p) => (
                  <TableRow key={p.provider}>
                    <TableCell>{PROVIDER_LABEL[p.provider] ?? p.provider}</TableCell>
                    <TableCell>{p.tenants}</TableCell>
                    <TableCell>{p.creditsConsumed}</TableCell>
                    <TableCell>{p.inputTokens.toLocaleString('fr-FR')} / {p.outputTokens.toLocaleString('fr-FR')}</TableCell>
                    <TableCell>${p.estCostUsd.toFixed(2)}</TableCell>
                    <TableCell>{p.estRevenueMad.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
