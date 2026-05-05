import Link from 'next/link';
import { ArrowRight, Stethoscope } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { listConsultations } from '@/lib/consultations/queries';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { LiveSearchInput } from '@/components/ui/live-search-input';
import { PageHeader } from '@/components/shell/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMad } from '@/lib/medications/format';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ q?: string }>;
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatusCell({
  isFinalized,
  paymentStatus,
  priceMad,
}: {
  isFinalized: boolean;
  paymentStatus: 'awaiting' | 'paid' | 'free';
  priceMad: string | null;
}) {
  if (!isFinalized) {
    return <StatusBadge variant="neutral">En cours</StatusBadge>;
  }
  if (paymentStatus === 'free') {
    return <StatusBadge variant="neutral">Gratuit</StatusBadge>;
  }
  if (paymentStatus === 'awaiting') {
    return (
      <StatusBadge variant="warning">
        En attente · {formatMad(priceMad)}
      </StatusBadge>
    );
  }
  return (
    <StatusBadge variant="success">
      Payé · {formatMad(priceMad)}
    </StatusBadge>
  );
}

export default async function ConsultationsPage({ searchParams }: Props) {
  const session = await requireSession();
  const { q = '' } = await searchParams;
  const rows = await listConsultations(session.tenantId, q);

  return (
    <>
      <PageHeader title="Consultations" description="Historique des consultations du cabinet." />
      <div className="px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LiveSearchInput
            defaultQuery={q}
            placeholder="Recherche par patient (nom, prénom)"
          />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5}>
                  <EmptyState
                    icon={Stethoscope}
                    title="Aucune consultation"
                    description={
                      q
                        ? `Aucun résultat pour « ${q} ».`
                        : 'Les consultations apparaîtront ici.'
                    }
                  />
                </TableEmpty>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="py-2">
                      <Link
                        href={`/consultations/${r.id}`}
                        className="flex items-center gap-3 -mx-3 -my-2 px-3 py-2 focus-visible:outline-none focus-visible:bg-muted/60"
                        aria-label={`Ouvrir la consultation de ${r.patientFullName}`}
                      >
                        <Avatar name={r.patientFullName} size="md" />
                        <span className="font-medium text-foreground">
                          {r.patientFullName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {fmtDate(r.consultedAt)}
                    </TableCell>
                    <TableCell className="text-small text-muted-foreground max-w-md">
                      <span className="line-clamp-1">{r.motif ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      <StatusCell
                        isFinalized={r.isFinalized}
                        paymentStatus={r.paymentStatus}
                        priceMad={r.priceMad}
                      />
                    </TableCell>
                    <TableCell className="text-right pr-3">
                      <Link
                        href={`/consultations/${r.id}`}
                        className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        style={{ transitionDuration: 'var(--duration-fast)' }}
                        aria-label={`Ouvrir ${r.patientFullName}`}
                      >
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
