import {
  Activity,
  BarChart3,
  Building2,
  Coins,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { getGlobalUsageReport } from '@/lib/admin/queries';
import { StatCard } from '@/components/admin/stat-card';
import { UsageChart } from '@/components/admin/usage-chart';
import { PageHeader } from '@/components/shell/page-header';
import { Section } from '@/components/ui/section';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';

export const dynamic = 'force-dynamic';

const PROVIDER_LABEL: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  mistral: 'Mistral',
};

export default async function AdminDashboardPage() {
  const r = await getGlobalUsageReport(30);
  return (
    <>
      <PageHeader
        eyebrow="30 derniers jours"
        title="Tableau de bord"
        description="Vue d'ensemble de l'activité de la plateforme."
      />
      <div className="px-6 py-6 space-y-8 max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Building2}
            tone="admin"
            label="Cabinets actifs"
            value={String(r.activeTenants)}
          />
          <StatCard
            icon={Coins}
            tone="primary"
            label="Crédits consommés"
            value={String(r.creditsConsumed30d)}
            hint="débits"
          />
          <StatCard
            icon={DollarSign}
            tone="warning"
            label="Coût IA estimé"
            value={`$${r.estCostUsd30d.toFixed(2)}`}
            hint={`≈ ${(r.estCostUsd30d * 10).toFixed(2)} MAD`}
          />
          <StatCard
            icon={TrendingUp}
            tone="success"
            label="Marge estimée"
            value={`${r.estMarginMad30d.toFixed(2)} MAD`}
            hint={`${r.marginPct}% sur ${r.estRevenueMad30d.toFixed(2)} MAD`}
          />
        </div>

        <Section icon={Activity} title="Activité quotidienne">
          <div className="rounded-xl border border-border bg-card shadow-card p-4">
            <UsageChart daily={r.daily} />
          </div>
        </Section>

        <Section icon={BarChart3} title="Par fournisseur">
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
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
                    <EmptyState
                      icon={BarChart3}
                      title="Pas d'utilisation IA"
                      description="Aucun débit n'a été enregistré pour la période."
                    />
                  </TableEmpty>
                ) : (
                  r.perProvider.map((p) => (
                    <TableRow key={p.provider}>
                      <TableCell className="font-medium">
                        {PROVIDER_LABEL[p.provider] ?? p.provider}
                      </TableCell>
                      <TableCell className="tabular-nums">{p.tenants}</TableCell>
                      <TableCell className="tabular-nums">{p.creditsConsumed}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {p.inputTokens.toLocaleString('fr-FR')} / {p.outputTokens.toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell className="tabular-nums">${p.estCostUsd.toFixed(2)}</TableCell>
                      <TableCell className="tabular-nums">{p.estRevenueMad.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Section>
      </div>
    </>
  );
}
