import Link from 'next/link';
import { BarChart3, Building2, Coins, DollarSign, Mail, TrendingUp } from 'lucide-react';
import { getGlobalUsageReport } from '@/lib/admin/queries';
import { StatCard } from '@/components/admin/stat-card';
import { UsageChart } from '@/components/admin/usage-chart';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';

export const dynamic = 'force-dynamic';

const PROVIDER_LABEL: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  mistral: 'Mistral',
};

const MAD_PER_USD = 10;

function fmtNumber(n: number): string {
  return n.toLocaleString('fr-FR');
}

function fmtMad(n: number): string {
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
}

function fmtUsd(n: number): string {
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

export default async function AdminDashboardPage() {
  const r = await getGlobalUsageReport(30);
  const totalConsumed = r.daily.reduce((sum, d) => sum + d.consumed, 0);
  return (
    <>
      <PageHeader
        eyebrow="30 derniers jours"
        title="Tableau de bord"
        description="Vue d'ensemble de l'activité de la plateforme."
        actions={
          <Link href="/admin/invites" className={buttonVariants()}>
            <Mail aria-hidden />
            Créer une invitation
          </Link>
        }
      />
      <PageBody>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={Building2}
            label="Cabinets actifs"
            value={fmtNumber(r.activeTenants)}
          />
          <StatCard
            icon={Coins}
            label="Crédits consommés"
            value={fmtNumber(r.creditsConsumed30d)}
            hint="consultations IA débitées"
          />
          <StatCard
            icon={DollarSign}
            label="Coût IA estimé"
            value={fmtUsd(r.estCostUsd30d)}
            hint={`≈ ${fmtMad(r.estCostUsd30d * MAD_PER_USD)}`}
          />
          <StatCard
            icon={TrendingUp}
            tone={r.estMarginMad30d < 0 ? 'danger' : 'neutral'}
            label="Marge estimée"
            value={fmtMad(r.estMarginMad30d)}
            hint={`${r.marginPct} % sur ${fmtMad(r.estRevenueMad30d)}`}
          />
        </div>

        <section className="panel p-4" aria-labelledby="daily-usage-title">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="daily-usage-title" className="eyebrow">
              Activité IA quotidienne
            </h2>
            <span className="text-title font-semibold tabular-nums text-foreground">
              {fmtNumber(totalConsumed)}
              <span className="ml-1 text-small font-normal text-muted-foreground">
                consultations
              </span>
            </span>
          </div>
          <UsageChart daily={r.daily} />
        </section>

        <Section title="Par fournisseur" count={r.perProvider.length}>
          <div className="panel overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead className="text-right">Cabinets</TableHead>
                  <TableHead className="text-right">Crédits</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Tokens (in / out)</TableHead>
                  <TableHead className="text-right">Coût</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Revenu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.perProvider.length === 0 ? (
                  <TableEmpty colSpan={6}>
                    <EmptyState
                      icon={BarChart3}
                      title="Pas d'utilisation IA"
                      description="Aucun débit n'a été enregistré sur les 30 derniers jours."
                    />
                  </TableEmpty>
                ) : (
                  r.perProvider.map((p) => (
                    <TableRow key={p.provider}>
                      <TableCell className="font-medium">
                        {PROVIDER_LABEL[p.provider] ?? p.provider}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.tenants}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNumber(p.creditsConsumed)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                        {fmtNumber(p.inputTokens)} / {fmtNumber(p.outputTokens)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtUsd(p.estCostUsd)}</TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {fmtMad(p.estRevenueMad)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Section>
      </PageBody>
    </>
  );
}
