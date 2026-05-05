import { redirect } from 'next/navigation';
import { requireDoctor } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { getRevenueSummary } from '@/lib/stats/queries';
import { type StatsRange } from '@/lib/time';
import { formatMad } from '@/lib/medications/format';
import { RangePills } from './range-pills';

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

  const summary = await getRevenueSummary(session.tenantId, range);

  return (
    <>
      <PageHeader title="Statistiques" description="Recettes et activité du cabinet." />
      <div className="px-6 py-6 space-y-6 max-w-6xl">
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

        {/* Sections (charts + tables) land in Task 12. */}
      </div>
    </>
  );
}
