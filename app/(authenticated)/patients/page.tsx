import Link from 'next/link';
import { ChevronRight, Plus, Users } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import {
  searchPatientsPage,
  type PatientSort,
  type PatientSortDir,
} from '@/lib/patients/queries';
import { formatAge } from '@/lib/patients/age';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { LiveSearchInput } from '@/components/ui/live-search-input';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { FilterPill } from '@/components/ui/filter-pill';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';

const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<{
    q?: string;
    archived?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
};

export default async function PatientsPage({ searchParams }: Props) {
  const session = await requireSession();
  const { q = '', archived, page: pageRaw, sort: sortRaw, dir: dirRaw } = await searchParams;
  const includeArchived = archived === '1';
  const trimmed = q.trim();
  const requestedPage = Number.parseInt(pageRaw ?? '1', 10) || 1;
  const sort: PatientSort = sortRaw === 'created' ? 'created' : 'name';
  const dir: PatientSortDir =
    dirRaw === 'desc' ? 'desc' : dirRaw === 'asc' ? 'asc' : sort === 'created' ? 'desc' : 'asc';

  const { rows, total, page, totalPages } = await searchPatientsPage(
    session.tenantId,
    trimmed,
    { includeArchived, page: requestedPage, pageSize: PAGE_SIZE, sort, dir },
  );

  const buildHref = (n: number) => buildPatientsHref({ q: trimmed, includeArchived, page: n, sort, dir });
  const toggleNameSortHref = buildPatientsHref({
    q: trimmed,
    includeArchived,
    page: 1,
    sort: 'name',
    dir: sort === 'name' && dir === 'asc' ? 'desc' : 'asc',
  });

  return (
    <>
      <PageHeader
        title="Patients"
        description="Recherchez un dossier ou créez un nouveau patient."
        actions={
          <Link href="/patients/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Nouveau patient
          </Link>
        }
      />

      <PageBody>
        <div className="flex flex-wrap items-center gap-2">
          <LiveSearchInput
            defaultQuery={q}
            placeholder="Recherche : nom, prénom, téléphone, CIN"
          />
          <FilterPill
            href={buildPatientsHref({
              q: trimmed,
              includeArchived: !includeArchived,
              page: 1,
              sort,
              dir,
            })}
            active={includeArchived}
          >
            Inclure les archivés
          </FilterPill>
          <span className="ml-auto text-small text-muted-foreground tabular-nums">
            {total} patient{total === 1 ? '' : 's'}
            {trimmed ? ` trouvé${total === 1 ? '' : 's'}` : ''}
          </span>
        </div>

        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>
                  <SortableHeader href={toggleNameSortHref} active={sort === 'name'} dir={dir}>
                    Patient
                  </SortableHeader>
                </TableHead>
                <TableHead className="hidden sm:table-cell">Âge</TableHead>
                <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                <TableHead className="hidden md:table-cell">CIN</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Ouvrir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5}>
                  <EmptyState
                    icon={Users}
                    title={trimmed ? 'Aucun résultat' : 'Aucun patient'}
                    description={
                      trimmed
                        ? `Aucun patient ne correspond à « ${trimmed} ».`
                        : 'Créez votre premier patient pour commencer.'
                    }
                    action={
                      trimmed ? undefined : (
                        <Link href="/patients/new" className={buttonVariants({ variant: 'secondary' })}>
                          <Plus aria-hidden />
                          Nouveau patient
                        </Link>
                      )
                    }
                  />
                </TableEmpty>
              ) : (
                rows.map((p) => {
                  const fullName = `${p.lastName} ${p.firstName}`;
                  const age = formatAge(p.dateOfBirth);
                  const contact = [p.phone, p.cin].filter(Boolean).join(' · ');
                  return (
                    // Whole-row click: the name link stretches over the row
                    // (after:inset-0) so there is one tab stop per patient.
                    <TableRow key={p.id} className="group/row relative cursor-pointer">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={fullName}
                            size="sm"
                            tone={p.isArchived ? 'muted' : 'primary'}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/patients/${p.id}`}
                                aria-label={`Ouvrir le dossier de ${fullName}`}
                                className={cn(
                                  'truncate font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring',
                                  p.isArchived
                                    ? 'text-muted-foreground'
                                    : 'text-foreground group-hover/row:text-primary',
                                )}
                              >
                                {fullName}
                              </Link>
                              {p.isArchived ? (
                                <StatusBadge variant="neutral">Archivé</StatusBadge>
                              ) : null}
                            </div>
                            {/* Phones/tablets: secondary columns collapse under the name. */}
                            <div className="truncate text-small text-muted-foreground tabular-nums md:hidden">
                              <span className="sm:hidden">
                                {[age, contact].filter(Boolean).join(' · ')}
                              </span>
                              <span className="hidden sm:inline">{contact}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                        {age}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                        {p.phone ?? '—'}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                        {p.cin ?? '—'}
                      </TableCell>
                      <TableCell className="w-12 text-right">
                        <ChevronRight
                          className="ml-auto size-4 text-subtle-foreground group-hover/row:text-primary"
                          aria-hidden
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
      </PageBody>
    </>
  );
}


function buildPatientsHref({
  q,
  includeArchived,
  page,
  sort,
  dir,
}: {
  q: string;
  includeArchived: boolean;
  page: number;
  sort: PatientSort;
  dir: PatientSortDir;
}): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (includeArchived) params.set('archived', '1');
  if (page > 1) params.set('page', String(page));
  // Only persist sort params when they diverge from the default
  // (name ASC). Keeps URLs short for the common case.
  if (sort !== 'name' || dir !== 'asc') {
    params.set('sort', sort);
    params.set('dir', dir);
  }
  const qs = params.toString();
  return qs ? `/patients?${qs}` : '/patients';
}
