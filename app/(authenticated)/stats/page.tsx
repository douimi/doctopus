import { redirect } from 'next/navigation';
import { Activity, AlertCircle, Award, PieChart } from 'lucide-react';
import { requireDoctor } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { Section } from '@/components/ui/section';
import {
  getRevenueSummary,
  getRevenueByDay,
  getRevenueByMethod,
  getOutstandingPayments,
  getTopPatients,
} from '@/lib/stats/queries';
import { type StatsRange } from '@/lib/time';
import { formatMad } from '@/lib/medications/format';
import { RangePills } from './range-pills';
import { RevenueChart } from './revenue-chart';
import { MethodChart } from './method-chart';
import { OutstandingTable } from './outstanding-table';
import { TopPatientsTable } from './top-patients-table';

export const dynamic = 'force-dynamic';

const VALID_RANGES = new Set<StatsRange>(['today', '7d', '30d', '90d']);

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await requireDoctor();
  const { range: rawRange } = await searchParams;
  const range: StatsRange = VALID_RANGES.has(rawRange as StatsRange)
    ? (rawRange as StatsRange)
    : '30d';
  if (rawRange && rawRange !== range) {
    redirect(`/stats?range=${range}`);
  }

  const [summary, revenueByDay, revenueByMethod, outstanding, topPatients] = await Promise.all([
    getRevenueSummary(session.tenantId, range),
    getRevenueByDay(session.tenantId, range),
    getRevenueByMethod(session.tenantId, range),
    getOutstandingPayments(session.tenantId, range),
    getTopPatients(session.tenantId, range, 10),
  ]);

  return (
    <>
      <PageHeader title="Statistiques" description="Recettes et activité du cabinet." />
      <div className="px-6 py-6 space-y-6">
        <RangePills active={range} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            tone="success"
            label="Recettes"
            value={formatMad(summary.totalRevenue)}
            hint={`${summary.paidCount} consultations`}
          />
          <StatCard
            tone="primary"
            label="Consultations"
            value={String(summary.totalCount)}
            hint={`${summary.paidCount} payés · ${summary.awaitingCount} en attente · ${summary.freeCount} gratuits`}
          />
          <StatCard
            tone="admin"
            label="Prix moyen"
            value={summary.avgPrice ? formatMad(summary.avgPrice) : '—'}
            hint="MAD/consultation"
          />
          <StatCard
            tone="warning"
            label="En attente"
            value={String(summary.awaitingCount)}
            hint={`${formatMad(summary.awaitingTotal)} à encaisser`}
          />
        </div>

        <Section icon={Activity} title="Recettes par jour">
          <RevenueChart daily={revenueByDay} />
        </Section>

        <Section icon={PieChart} title="Recettes par méthode">
          <MethodChart byMethod={revenueByMethod} />
        </Section>

        <Section icon={AlertCircle} title="Paiements en attente" count={outstanding.length}>
          <OutstandingTable rows={outstanding} />
        </Section>

        <Section icon={Award} title="Top 10 patients" count={topPatients.length}>
          <TopPatientsTable rows={topPatients} />
        </Section>
      </div>
    </>
  );
}
