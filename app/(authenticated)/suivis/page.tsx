import Link from 'next/link';
import { ArrowRight, Plus, RefreshCw } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { listFollowUpsPage } from '@/lib/consultations/queries';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LiveSearchInput } from '@/components/ui/live-search-input';
import { LiveRefresh } from '@/components/shell/live-refresh';
import { PageHeader } from '@/components/shell/page-header';
import { Pagination } from '@/components/ui/pagination';
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

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function FollowUpsPage({ searchParams }: Props) {
  const session = await requireSession();
  const { q = '', page: pageRaw } = await searchParams;
  const trimmed = q.trim();
  const requestedPage = Number.parseInt(pageRaw ?? '1', 10) || 1;
  const { rows, total, page, totalPages } = await listFollowUpsPage(
    session.tenantId,
    trimmed,
    { page: requestedPage, pageSize: PAGE_SIZE },
  );

  const buildHref = (n: number) => {
    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    if (n > 1) params.set('page', String(n));
    const qs = params.toString();
    return qs ? `/suivis?${qs}` : '/suivis';
  };

  return (
    <>
      <LiveRefresh tenantId={session.tenantId} channel="suivis-list" />
      <PageHeader
        title="Suivis"
        description="Visites de contrôle rattachées à une consultation précédente."
        actions={
          <Link href="/suivis/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Nouveau suivi
          </Link>
        }
      />
      <div className="px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LiveSearchInput
            defaultQuery={q}
            placeholder="Recherche par patient (nom, prénom)"
          />
          <span className="text-small text-muted-foreground ml-auto tabular-nums">
            {total} suivi{total === 1 ? '' : 's'}
            {trimmed ? ' trouvés' : ''}
          </span>
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
                    icon={RefreshCw}
                    title="Aucun suivi"
                    description={
                      trimmed
                        ? `Aucun résultat pour « ${trimmed} ».`
                        : 'Créez un suivi depuis une consultation finalisée, ou ici via « Nouveau suivi ».'
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
                        aria-label={`Ouvrir le suivi de ${r.patientFullName}`}
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
                      {r.isFinalized ? (
                        <StatusBadge variant="success">Finalisé</StatusBadge>
                      ) : (
                        <StatusBadge variant="warning">En cours</StatusBadge>
                      )}
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

        <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </>
  );
}
