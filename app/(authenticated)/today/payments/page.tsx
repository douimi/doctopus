import { requireSession } from '@/lib/auth/session';
import { getPaymentsForToday } from '@/lib/payments/queries';
import { formatMad } from '@/lib/medications/format';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { LiveRefresh } from '@/components/shell/live-refresh';
import { Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import {
  AwaitingList,
  CollectedList,
  methodLabel,
  sumMad,
} from '@/components/today/payments-column';

/**
 * Encaissements — the assistant's money view (UX brief §2): everything
 * awaiting payment (all dates, oldest debts included) and what was
 * collected today, with a per-method breakdown for the end-of-day count.
 * Both roles can open it; recording a payment is allowed for both.
 */
export default async function PaymentsPage() {
  const session = await requireSession();
  const { awaiting, collectedToday } = await getPaymentsForToday(session.tenantId);

  const paid = collectedToday.filter((r) => r.paymentStatus === 'paid');
  const freeCount = collectedToday.length - paid.length;
  const byMethod = new Map<string, { count: number; total: number }>();
  for (const r of paid) {
    const key = methodLabel(r.paymentMethod);
    const cur = byMethod.get(key) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(r.priceMad ?? 0);
    byMethod.set(key, cur);
  }
  const methods = [...byMethod.entries()].sort((a, b) => b[1].total - a[1].total);

  return (
    <>
      <LiveRefresh />
      <PageHeader
        back={{ href: '/today', label: "Aujourd'hui" }}
        title="Encaissements"
        description="Consultations à encaisser et paiements reçus aujourd'hui."
      />
      <PageBody>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="À encaisser"
            value={formatMad(sumMad(awaiting))}
            hint={`${awaiting.length} consultation${awaiting.length === 1 ? '' : 's'}`}
            tone={awaiting.length > 0 ? 'warning' : 'neutral'}
          />
          <StatCard
            label="Encaissé aujourd'hui"
            value={formatMad(sumMad(paid))}
            hint={`${paid.length} paiement${paid.length === 1 ? '' : 's'}`}
          />
          <StatCard label="Gratuits aujourd'hui" value={String(freeCount)} hint="suivis, gestes offerts" />
          <div className="panel p-4">
            <span className="eyebrow">Par méthode</span>
            {methods.length === 0 ? (
              <p className="mt-2 text-small text-muted-foreground">Aucun paiement aujourd&apos;hui.</p>
            ) : (
              <dl className="mt-2 space-y-1">
                {methods.map(([label, v]) => (
                  <div key={label} className="flex items-baseline justify-between gap-2 text-small">
                    <dt className="text-muted-foreground">
                      {label} <span className="tabular-nums">({v.count})</span>
                    </dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {formatMad(v.total.toFixed(2))}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <Section title="À encaisser" count={awaiting.length}>
            <AwaitingList rows={awaiting} />
          </Section>
          <Section title="Encaissés aujourd'hui" count={collectedToday.length}>
            <CollectedList rows={collectedToday} />
          </Section>
        </div>
      </PageBody>
    </>
  );
}
