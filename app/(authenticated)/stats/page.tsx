import { redirect } from 'next/navigation';
import { requireDoctor } from '@/lib/auth/guards';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { StatCard, type StatComparison } from '@/components/ui/stat-card';
import { Section } from '@/components/ui/section';
import {
  getMonthlySeries,
  getRevenueSummary,
  getRevenueByDay,
  getRevenueByMethod,
  getOutstandingPayments,
  getTopPatients,
  type RevenueByDay,
  type RevenueSummary,
} from '@/lib/stats/queries';
import { changeRatio } from '@/lib/stats/compare';
import {
  currentMonthKey,
  daysInMonth,
  elapsedDaysInMonth,
  formatMonthKeyFr,
  monthBoundsUtc,
  monthPrefixBoundsUtc,
  parseMonthKey,
  previousPeriod,
  rangeBoundsUtc,
  shiftMonthKey,
  type MonthKey,
  type StatsPeriod,
  type StatsRange,
} from '@/lib/time';
import { formatMad } from '@/lib/medications/format';
import { RangePills } from './range-pills';
import { MonthControls } from './period-controls';
import { RevenueChart } from './revenue-chart';
import { CumulativeChart, type CumulativePoint } from './cumulative-chart';
import { MonthlyChart } from './monthly-chart';
import { MonthlyTable } from './monthly-table';
import { MethodChart } from './method-chart';
import { OutstandingTable } from './outstanding-table';
import { TopPatientsTable } from './top-patients-table';

export const dynamic = 'force-dynamic';

const VALID_RANGES = new Set<StatsRange>(['today', '7d', '30d', '90d']);
/** How far back the month pickers go. */
const MONTH_HISTORY = 24;

function cumulative(byDay: RevenueByDay, month: MonthKey, upToDay: number): Array<number | null> {
  const perDay = new Map<number, number>();
  for (const d of byDay) {
    if (d.date.startsWith(month)) perDay.set(Number(d.date.slice(8, 10)), Number(d.revenue));
  }
  let running = 0;
  return Array.from({ length: daysInMonth(month) }, (_, i) => {
    running += perDay.get(i + 1) ?? 0;
    return i + 1 <= upToDay ? running : null;
  });
}

function comparisons(
  cur: RevenueSummary,
  prev: RevenueSummary,
  label: string,
): Record<'revenue' | 'count' | 'avg' | 'awaiting', StatComparison> {
  return {
    revenue: {
      ratio: changeRatio(Number(cur.totalRevenue), Number(prev.totalRevenue)),
      label,
      previous: formatMad(prev.totalRevenue),
    },
    count: {
      ratio: changeRatio(cur.totalCount, prev.totalCount),
      label,
      previous: String(prev.totalCount),
    },
    avg: {
      ratio:
        cur.avgPrice && prev.avgPrice ? changeRatio(Number(cur.avgPrice), Number(prev.avgPrice)) : null,
      label,
      previous: prev.avgPrice ? formatMad(prev.avgPrice) : '—',
    },
    awaiting: {
      ratio: changeRatio(cur.awaitingCount, prev.awaitingCount),
      label,
      previous: String(prev.awaitingCount),
      invert: true,
    },
  };
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; month?: string; compare?: string }>;
}) {
  const session = await requireDoctor();
  const { range: rawRange, month: rawMonth, compare: rawCompare } = await searchParams;
  if (rawRange && !VALID_RANGES.has(rawRange as StatsRange)) redirect('/stats');

  const thisMonth = currentMonthKey();
  const oldestMonth = shiftMonthKey(thisMonth, -(MONTH_HISTORY - 1));
  const range = rawRange ? (rawRange as StatsRange) : null;

  // Month view (default): displayed month vs a comparison month. While the
  // month is still running, both are cut at the same day of month so the
  // comparison is like-for-like.
  const inBounds = (k: string | undefined): k is MonthKey =>
    !!parseMonthKey(k) && k! <= thisMonth && k! >= oldestMonth;
  const month = range ? null : inBounds(rawMonth) ? rawMonth : thisMonth;
  const compareMonth = month
    ? inBounds(rawCompare) && rawCompare !== month
      ? rawCompare
      : shiftMonthKey(month, -1) >= oldestMonth
        ? shiftMonthKey(month, -1)
        : null
    : null;
  const elapsed = month ? elapsedDaysInMonth(month) : null;

  let period: StatsPeriod;
  let comparePeriod: StatsPeriod | null;
  let compareLabel: string;
  if (month) {
    period = monthBoundsUtc(month);
    comparePeriod = compareMonth
      ? elapsed
        ? monthPrefixBoundsUtc(compareMonth, elapsed)
        : monthBoundsUtc(compareMonth)
      : null;
    compareLabel = compareMonth
      ? `vs ${formatMonthKeyFr(compareMonth, { short: true })}${
          elapsed ? ` (1–${Math.min(elapsed, daysInMonth(compareMonth))})` : ''
        }`
      : '';
  } else {
    period = rangeBoundsUtc(range!);
    comparePeriod = previousPeriod(period);
    compareLabel = range === 'today' ? 'vs hier' : 'vs période précédente';
  }

  const seriesFrom = [shiftMonthKey(thisMonth, -11), month, compareMonth]
    .filter((k): k is string => !!k)
    .sort()[0];

  const [summary, prevSummary, revenueByDay, compareByDay, revenueByMethod, outstanding, topPatients, monthly] =
    await Promise.all([
      getRevenueSummary(session.tenantId, period),
      comparePeriod ? getRevenueSummary(session.tenantId, comparePeriod) : null,
      getRevenueByDay(session.tenantId, period),
      compareMonth ? getRevenueByDay(session.tenantId, monthBoundsUtc(compareMonth)) : null,
      getRevenueByMethod(session.tenantId, period),
      getOutstandingPayments(session.tenantId, period),
      getTopPatients(session.tenantId, period, 10),
      getMonthlySeries(session.tenantId, seriesFrom, thisMonth),
    ]);

  const cmp = prevSummary ? comparisons(summary, prevSummary, compareLabel) : null;

  const monthOptions = Array.from({ length: MONTH_HISTORY }, (_, i) => {
    const key = shiftMonthKey(thisMonth, -i);
    return { key, label: formatMonthKeyFr(key) };
  });
  const monthLabels = Object.fromEntries(
    monthly.map((r) => [r.month, formatMonthKeyFr(r.month)]),
  );

  let cumulativeData: CumulativePoint[] = [];
  if (month && compareMonth && compareByDay) {
    const cur = cumulative(revenueByDay, month, elapsed ?? daysInMonth(month));
    const prev = cumulative(compareByDay, compareMonth, daysInMonth(compareMonth));
    cumulativeData = Array.from({ length: Math.max(cur.length, prev.length) }, (_, i) => ({
      day: i + 1,
      current: cur[i] ?? null,
      compare: prev[i] ?? null,
    }));
  }

  const periodLabel = month ? formatMonthKeyFr(month) : null;

  return (
    <>
      <PageHeader title="Statistiques" description="Recettes et activité du cabinet." />
      <PageBody>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <RangePills active={range ?? 'month'} />
            {month ? (
              <MonthControls
                month={month}
                compare={compareMonth ?? ''}
                months={monthOptions}
                prevHref={month > oldestMonth ? `/stats?month=${shiftMonthKey(month, -1)}` : null}
                nextHref={month < thisMonth ? `/stats?month=${shiftMonthKey(month, 1)}` : null}
              />
            ) : null}
          </div>
          {elapsed && compareMonth ? (
            <p className="text-small text-muted-foreground">
              Mois en cours : les écarts comparent du 1er au {elapsed} de chaque mois.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Recettes"
            value={formatMad(summary.totalRevenue)}
            hint={`${summary.paidCount} consultations payées`}
            comparison={cmp?.revenue}
          />
          <StatCard
            label="Consultations"
            value={String(summary.totalCount)}
            hint={`${summary.paidCount} payés · ${summary.awaitingCount} en attente · ${summary.freeCount} gratuits`}
            comparison={cmp?.count}
          />
          <StatCard
            label="Prix moyen"
            value={summary.avgPrice ? formatMad(summary.avgPrice) : '—'}
            hint="par consultation payante"
            comparison={cmp?.avg}
          />
          {/* Only the number that needs action gets a tone. */}
          <StatCard
            tone={summary.awaitingCount > 0 ? 'warning' : 'neutral'}
            label="En attente"
            value={String(summary.awaitingCount)}
            hint={`${formatMad(summary.awaitingTotal)} à encaisser`}
            comparison={cmp?.awaiting}
          />
        </div>

        {month && compareMonth ? (
          <Section
            title={
              <span className="capitalize">
                Recettes cumulées — {periodLabel} vs {formatMonthKeyFr(compareMonth)}
              </span>
            }
          >
            <CumulativeChart
              data={cumulativeData}
              currentLabel={periodLabel!}
              compareLabel={formatMonthKeyFr(compareMonth)}
            />
          </Section>
        ) : null}

        <Section title="Recettes par jour">
          <RevenueChart daily={revenueByDay} />
        </Section>

        <Section title="Évolution mois par mois">
          <MonthlyChart
            data={monthly.map((r) => ({
              key: r.month,
              label: formatMonthKeyFr(r.month, { short: true }),
              revenue: Number(r.revenue),
            }))}
            selected={month}
            compare={compareMonth}
          />
          <MonthlyTable rows={monthly} labels={monthLabels} selected={month} runningMonth={thisMonth} />
        </Section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Section title="Recettes par méthode">
            <MethodChart byMethod={revenueByMethod} />
          </Section>

          <Section title="Top 10 patients" count={topPatients.length}>
            <TopPatientsTable rows={topPatients} />
          </Section>
        </div>

        <Section title="Paiements en attente" count={outstanding.length}>
          <OutstandingTable rows={outstanding} />
        </Section>
      </PageBody>
    </>
  );
}
