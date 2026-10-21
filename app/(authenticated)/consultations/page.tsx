import Link from 'next/link';
import { ArrowRight, Plus, RefreshCw, Stethoscope } from 'lucide-react';
import { requireDoctor } from '@/lib/auth/guards';
import {
  listConsultationsPage,
  listFollowUpsPage,
  type ConsultationSort,
  type ConsultationSortDir,
} from '@/lib/consultations/queries';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LiveSearchInput } from '@/components/ui/live-search-input';
import { LiveRefresh } from '@/components/shell/live-refresh';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { Pagination } from '@/components/ui/pagination';
import { SegmentedControl, SegmentedControlLink } from '@/components/ui/segmented-control';
import { SortableHeader } from '@/components/ui/sortable-header';
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

const PAGE_SIZE = 25;
const SORTS: ReadonlyArray<ConsultationSort> = ['patient', 'consultedAt', 'status'];

/** `?type=suivi` narrows the list to follow-ups (the old /suivis page). */
type ListType = 'all' | 'suivi';

type Props = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    dir?: string;
    type?: string;
  }>;
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
    return <StatusBadge variant="info" dot>En cours</StatusBadge>;
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
  // Doctor-only: every row links to /consultations/[id], which assistants
  // can't open. The nav already hides this page for them.
  const session = await requireDoctor();
  const {
    q = '',
    page: pageRaw,
    sort: sortRaw,
    dir: dirRaw,
    type: typeRaw,
  } = await searchParams;
  const type: ListType = typeRaw === 'suivi' ? 'suivi' : 'all';
  const trimmed = q.trim();
  const requestedPage = Number.parseInt(pageRaw ?? '1', 10) || 1;
  const sort: ConsultationSort = SORTS.includes(sortRaw as ConsultationSort)
    ? (sortRaw as ConsultationSort)
    : 'consultedAt';
  const dir: ConsultationSortDir = dirRaw === 'asc' ? 'asc' : 'desc';

  const list = type === 'suivi' ? listFollowUpsPage : listConsultationsPage;
  const { rows, total, page, totalPages } = await list(session.tenantId, trimmed, {
    page: requestedPage,
    pageSize: PAGE_SIZE,
    sort,
    dir,
  });

  const buildHref = (params: {
    q?: string;
    page?: number;
    sort?: ConsultationSort;
    dir?: ConsultationSortDir;
    type?: ListType;
  }) => {
    const sp = new URLSearchParams();
    const t = params.type ?? type;
    if (t === 'suivi') sp.set('type', 'suivi');
    if (params.q ?? trimmed) sp.set('q', params.q ?? trimmed);
    if ((params.page ?? page) > 1) sp.set('page', String(params.page ?? page));
    const s = params.sort ?? sort;
    const d = params.dir ?? dir;
    if (s !== 'consultedAt' || d !== 'desc') {
      sp.set('sort', s);
      sp.set('dir', d);
    }
    const qs = sp.toString();
    return qs ? `/consultations?${qs}` : '/consultations';
  };

  const sortHref = (col: ConsultationSort) =>
    buildHref({
      page: 1,
      sort: col,
      dir: sort === col && dir === 'desc' ? 'asc' : 'desc',
    });

  const isSuivi = type === 'suivi';
  const noun = isSuivi ? 'suivi' : 'consultation';
  const plural = total === 1 ? '' : 's';

  return (
    <>
      <LiveRefresh tenantId={session.tenantId} channel="consultations-list" />
      <PageHeader
        title="Consultations"
        description={
          isSuivi
            ? 'Visites de contrôle rattachées à une consultation précédente.'
            : 'Historique des consultations du cabinet.'
        }
        actions={
          <>
            <Link href="/suivis/new" className={buttonVariants({ variant: 'secondary' })}>
              <RefreshCw aria-hidden />
              Nouveau suivi
            </Link>
            <Link href="/consultations/new" className={buttonVariants()}>
              <Plus aria-hidden />
              Saisir une consultation
            </Link>
          </>
        }
      />
      <PageBody>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl label="Type de consultation">
            <SegmentedControlLink
              href={buildHref({ type: 'all', page: 1 })}
              active={!isSuivi}
            >
              Toutes
            </SegmentedControlLink>
            <SegmentedControlLink
              href={buildHref({ type: 'suivi', page: 1 })}
              active={isSuivi}
            >
              Suivis
            </SegmentedControlLink>
          </SegmentedControl>
          <LiveSearchInput
            defaultQuery={q}
            placeholder="Recherche par patient (nom, prénom)"
          />
          <span className="ml-auto text-small text-muted-foreground tabular-nums">
            {total} {noun}
            {plural}
            {trimmed ? ` trouvé${isSuivi ? '' : 'e'}${plural}` : ''}
          </span>
        </div>

        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader
                    href={sortHref('patient')}
                    active={sort === 'patient'}
                    dir={dir}
                  >
                    Patient
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    href={sortHref('consultedAt')}
                    active={sort === 'consultedAt'}
                    dir={dir}
                  >
                    Date
                  </SortableHeader>
                </TableHead>
                <TableHead className="hidden md:table-cell">Motif</TableHead>
                <TableHead>
                  <SortableHeader
                    href={sortHref('status')}
                    active={sort === 'status'}
                    dir={dir}
                  >
                    Statut
                  </SortableHeader>
                </TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Ouvrir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5}>
                  <EmptyState
                    icon={isSuivi ? RefreshCw : Stethoscope}
                    title={isSuivi ? 'Aucun suivi' : 'Aucune consultation'}
                    description={
                      trimmed
                        ? `Aucun résultat pour « ${trimmed} ».`
                        : isSuivi
                          ? 'Créez un suivi depuis une consultation finalisée, ou via « Nouveau suivi ».'
                          : 'Les consultations apparaîtront ici.'
                    }
                  />
                </TableEmpty>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} className="group/row">
                    <TableCell className="py-2">
                      <Link
                        href={`/consultations/${r.id}`}
                        className="-mx-4 -my-2 flex items-center gap-3 px-4 py-2 focus-visible:bg-muted/60 focus-visible:outline-none"
                        aria-label={`Ouvrir ${isSuivi ? 'le suivi' : 'la consultation'} de ${r.patientFullName}`}
                      >
                        <Avatar name={r.patientFullName} size="sm" />
                        <span className="font-medium text-foreground">
                          {r.patientFullName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                      {fmtDate(r.consultedAt)}
                    </TableCell>
                    <TableCell className="hidden max-w-md text-muted-foreground md:table-cell">
                      <span className="line-clamp-1">{r.motif ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      <StatusCell
                        isFinalized={r.isFinalized}
                        paymentStatus={r.paymentStatus}
                        priceMad={r.priceMad}
                      />
                    </TableCell>
                    <TableCell className="pr-3 text-right">
                      <Link
                        href={`/consultations/${r.id}`}
                        tabIndex={-1}
                        aria-hidden
                        className="inline-flex size-8 items-center justify-center rounded-md text-subtle-foreground transition-colors duration-(--duration-fast) hover:bg-muted group-hover/row:text-primary"
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

        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(n) => buildHref({ page: n })}
        />
      </PageBody>
    </>
  );
}
