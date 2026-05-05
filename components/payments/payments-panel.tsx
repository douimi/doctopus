import { Wallet, ChevronDown } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Section } from '@/components/ui/section';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatMad } from '@/lib/medications/format';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments/schemas';
import type { PaymentRow } from '@/lib/payments/queries';
import { EncaisserDialog } from './encaisser-dialog';

function fmtRelative(d: Date): string {
  const ms = Date.now() - d.getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function PaymentsPanel({
  awaiting,
  collectedToday,
  role,
}: {
  awaiting: PaymentRow[];
  collectedToday: PaymentRow[];
  role: 'doctor' | 'assistant';
}) {
  return (
    <Section icon={Wallet} title="Paiements" count={awaiting.length}>
      <div className="space-y-3">
        {awaiting.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Aucun paiement en attente"
            description="Les consultations clôturées apparaîtront ici."
          />
        ) : (
          <ul role="list" className="divide-y divide-border rounded-xl border border-border bg-card shadow-card overflow-hidden">
            {awaiting.map((r) => (
              <li key={r.consultationId} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={r.patientFullName} size="md" tone="primary" />
                <div className="flex-1 min-w-0">
                  <div className="text-body font-medium truncate">{r.patientFullName}</div>
                  <div className="text-small text-muted-foreground">{fmtRelative(r.finalizedAt)}</div>
                </div>
                <div className="text-body font-medium tabular-nums shrink-0">
                  {formatMad(r.priceMad)}
                </div>
                {role === 'assistant' ? (
                  <EncaisserDialog
                    consultationId={r.consultationId}
                    patientFullName={r.patientFullName}
                    priceMad={r.priceMad}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <details className="rounded-xl border border-border bg-card shadow-card overflow-hidden group">
          <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            <span className="text-body font-medium">Encaissés aujourd&apos;hui</span>
            <span className="text-small text-muted-foreground tabular-nums ml-auto">{collectedToday.length}</span>
          </summary>
          <div>
            {collectedToday.length === 0 ? (
              <div className="px-4 pb-4">
                <EmptyState icon={Wallet} title="Aucun paiement aujourd'hui" />
              </div>
            ) : (
              <ul role="list" className="divide-y divide-border border-t border-border">
                {collectedToday.map((r) => (
                  <li key={r.consultationId} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={r.patientFullName} size="md" tone="primary" />
                    <div className="flex-1 min-w-0">
                      <div className="text-body font-medium truncate">{r.patientFullName}</div>
                      <div className="text-small text-muted-foreground">
                        {r.paidAt ? fmtTime(r.paidAt) : ''}
                        {r.paidByName ? ` · encaissé par ${r.paidByName}` : ''}
                      </div>
                    </div>
                    {r.isFree ? (
                      <StatusBadge variant="neutral">Gratuit</StatusBadge>
                    ) : (
                      <>
                        <div className="text-body font-medium tabular-nums shrink-0">
                          {formatMad(r.priceMad)}
                        </div>
                        <StatusBadge variant="success">
                          {r.paymentMethod ? (PAYMENT_METHOD_LABELS[r.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? '—') : '—'}
                        </StatusBadge>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </div>
    </Section>
  );
}
