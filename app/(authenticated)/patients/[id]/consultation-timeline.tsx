import Link from 'next/link';
import { ChevronRight, CornerDownRight } from 'lucide-react';
import type { Consultation } from '@/db/schema';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatMad } from '@/lib/medications/format';
import { consultationStatus, paymentStatus } from '@/lib/status-labels';
import { cn } from '@/lib/utils';
import { buildTimeline } from './timeline';

function fmt(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Row({
  c,
  nested,
  canOpen,
}: {
  c: Consultation;
  nested: boolean;
  canOpen: boolean;
}) {
  const st = consultationStatus(c.isFinalized);
  const pay = paymentStatus(c.paymentStatus);
  const isFollowUp = c.parentConsultationId !== null;
  // The assistant sees the visit and its payment, not the clinical content.
  const title = canOpen
    ? c.diagnosis || c.motif || (isFollowUp ? 'Suivi' : 'Consultation')
    : isFollowUp
      ? 'Suivi'
      : 'Consultation';
  const sub = canOpen && c.diagnosis && c.motif ? c.motif : null;

  const content = (
    <>
      {nested ? (
        <CornerDownRight className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
      ) : null}
      <div className="w-24 shrink-0 text-small font-medium tabular-nums text-foreground">
        {fmt(c.consultedAt)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          {isFollowUp && canOpen ? (
            <span className="shrink-0 text-small font-medium text-muted-foreground">Suivi ·</span>
          ) : null}
          <span className="truncate text-body font-medium text-foreground">{title}</span>
        </div>
        {sub ? <div className="truncate text-small text-muted-foreground">{sub}</div> : null}
      </div>
      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        {c.isFinalized ? (
          <StatusBadge variant={pay.tone}>
            {pay.label}
            {c.paymentStatus === 'paid' && c.priceMad ? ` · ${formatMad(c.priceMad)}` : ''}
          </StatusBadge>
        ) : null}
        <StatusBadge variant={st.tone} dot>
          {st.label}
        </StatusBadge>
      </div>
      {canOpen ? (
        <ChevronRight
          className="size-4 shrink-0 text-subtle-foreground group-hover/row:text-primary"
          aria-hidden
        />
      ) : null}
    </>
  );

  const rowClass = cn(
    'group/row flex min-h-14 items-center gap-3 py-2.5 pr-4',
    nested ? 'pl-8' : 'pl-4',
  );

  return canOpen ? (
    <Link
      href={`/consultations/${c.id}`}
      className={cn(
        rowClass,
        'transition-colors duration-(--duration-fast) hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
      )}
    >
      {content}
    </Link>
  ) : (
    <div className={rowClass}>{content}</div>
  );
}

export function ConsultationTimeline({
  items,
  canOpen,
}: {
  items: Consultation[];
  /** Doctors can open consultations; assistants get a read-only list. */
  canOpen: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="panel px-4 py-8 text-center">
        <p className="text-body font-medium text-foreground">Aucune consultation</p>
        <p className="mt-1 text-small text-muted-foreground">
          Les consultations et leurs suivis apparaîtront ici.
        </p>
      </div>
    );
  }
  const nodes = buildTimeline(items);
  return (
    <ul role="list" className="panel divide-y divide-border overflow-hidden">
      {nodes.map((n) => (
        <li key={n.c.id}>
          <Row c={n.c} nested={false} canOpen={canOpen} />
          {n.children.length > 0 ? (
            <ul role="list" aria-label="Suivis" className="border-t border-dashed border-border bg-canvas/60">
              {n.children.map((child) => (
                <li key={child.id} className="border-t border-border first:border-t-0">
                  <Row c={child} nested canOpen={canOpen} />
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
