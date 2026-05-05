import { StatusBadge } from '@/components/ui/status-badge';
import { formatMad } from '@/lib/medications/format';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments/schemas';

export function FinalizedTarificationBadge({
  isFree,
  priceMad,
  paymentStatus,
  paymentMethod,
}: {
  isFree: boolean;
  priceMad: string | null;
  paymentStatus: 'awaiting' | 'paid' | 'free';
  paymentMethod: string | null;
}) {
  if (isFree || paymentStatus === 'free') {
    return <StatusBadge variant="neutral">Gratuit</StatusBadge>;
  }
  if (paymentStatus === 'awaiting') {
    return (
      <StatusBadge variant="warning">
        Prix : {formatMad(priceMad)} · En attente
      </StatusBadge>
    );
  }
  // paid
  const label = paymentMethod
    ? PAYMENT_METHOD_LABELS[paymentMethod as keyof typeof PAYMENT_METHOD_LABELS]
    : '—';
  return (
    <StatusBadge variant="success">
      Prix : {formatMad(priceMad)} · Payé · {label}
    </StatusBadge>
  );
}
