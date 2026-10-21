import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { EncaisserDialog } from '@/components/payments/encaisser-dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatMad } from '@/lib/medications/format';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments/schemas';
import type { PaymentRow } from '@/lib/payments/queries';
import { paymentStatus } from '@/lib/status-labels';
import { ColumnEmpty } from './column-empty';

export function fmtRelative(d: Date): string {
  const minutes = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'hier' : `il y a ${days} j`;
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function sumMad(rows: PaymentRow[]): string {
  return rows.reduce((s, r) => s + Number(r.priceMad ?? 0), 0).toFixed(2);
}

export function methodLabel(m: string | null): string {
  if (!m) return '—';
  return PAYMENT_METHOD_LABELS[m as keyof typeof PAYMENT_METHOD_LABELS] ?? '—';
}

/** Awaiting-payment rows with the Encaisser action. */
export function AwaitingList({ rows }: { rows: PaymentRow[] }) {
  if (rows.length === 0) {
    return (
      <ColumnEmpty
        title="Rien à encaisser"
        description="Les consultations clôturées en attente de paiement apparaîtront ici."
      />
    );
  }
  return (
    <ul role="list" className="panel divide-y divide-border overflow-hidden">
      {rows.map((r) => (
        <li
          key={r.consultationId}
          className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-(--duration-fast) hover:bg-muted/40"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-body font-medium text-foreground">{r.patientFullName}</div>
            <div className="text-small text-muted-foreground">Clôturée {fmtRelative(r.finalizedAt)}</div>
          </div>
          <div className="shrink-0 text-body font-semibold tabular-nums">{formatMad(r.priceMad)}</div>
          <EncaisserDialog
            consultationId={r.consultationId}
            patientFullName={r.patientFullName}
            priceMad={r.priceMad}
          />
        </li>
      ))}
    </ul>
  );
}

/** Paid / free consultations collected today. */
export function CollectedList({ rows }: { rows: PaymentRow[] }) {
  if (rows.length === 0) {
    return <ColumnEmpty title="Aucun encaissement aujourd'hui" />;
  }
  return (
    <ul role="list" className="panel divide-y divide-border overflow-hidden">
      {rows.map((r) => {
        const st = paymentStatus(r.paymentStatus);
        return (
          <li key={r.consultationId} className="flex min-h-12 items-center gap-3 px-4 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-body text-foreground">{r.patientFullName}</div>
              <div className="truncate text-small text-muted-foreground tabular-nums">
                {r.paidAt ? fmtTime(r.paidAt) : ''}
                {r.isFree ? '' : ` · ${methodLabel(r.paymentMethod)}`}
                {r.paidByName ? ` · ${r.paidByName}` : ''}
              </div>
            </div>
            {r.isFree ? (
              <StatusBadge variant={st.tone}>{st.label}</StatusBadge>
            ) : (
              <div className="shrink-0 text-body tabular-nums text-muted-foreground">
                {formatMad(r.priceMad)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * "À encaisser" column of the /today board: the awaiting queue first, then
 * today's collected payments collapsed under a disclosure.
 */
export function PaymentsColumn({
  awaiting,
  collectedToday,
}: {
  awaiting: PaymentRow[];
  collectedToday: PaymentRow[];
}) {
  const collectedTotal = sumMad(collectedToday.filter((r) => !r.isFree));
  return (
    <div className="space-y-3">
      <AwaitingList rows={awaiting} />
      <details className="group">
        <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md px-1 text-small font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
          Encaissés aujourd&apos;hui ({collectedToday.length})
          <span className="ml-auto tabular-nums">{formatMad(collectedTotal)}</span>
        </summary>
        <div className="pt-2">
          <CollectedList rows={collectedToday} />
        </div>
      </details>
      <Link
        href="/today/payments"
        className="inline-flex items-center gap-1 rounded-sm px-1 text-small font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Voir les encaissements
        <ChevronRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}
