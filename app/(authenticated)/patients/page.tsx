import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUp, Plus, Users } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import {
  searchPatientsPage,
  type PatientSort,
  type PatientSortDir,
} from '@/lib/patients/queries';
import { ageFromDob } from '@/lib/patients/age';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { LiveSearchInput } from '@/components/ui/live-search-input';
import { PageHeader } from '@/components/shell/page-header';
import { Pagination } from '@/components/ui/pagination';
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
  const sortedByName = sort === 'name';
  const SortIcon = sortedByName ? (dir === 'asc' ? ArrowUp : ArrowDown) : null;

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

      <div className="px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LiveSearchInput
            defaultQuery={q}
            placeholder="Recherche : nom, prénom, téléphone, CIN"
          />
          <Link
            href={buildPatientsHref({
              q: trimmed,
              includeArchived: !includeArchived,
              page: 1,
              sort,
              dir,
            })}
            className={buttonVariants({ variant: 'ghost', size: 'default' })}
          >
            {includeArchived ? 'Masquer archivés' : 'Voir archivés'}
          </Link>
          <span className="text-small text-muted-foreground ml-auto tabular-nums">
            {total} patient{total === 1 ? '' : 's'}
            {trimmed ? ' trouvés' : ''}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Link
                    href={toggleNameSortHref}
                    aria-sort={
                      sortedByName ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                    className="inline-flex items-center gap-1 -mx-1 px-1 rounded hover:text-foreground transition-colors"
                    style={{ transitionDuration: 'var(--duration-fast)' }}
                  >
                    Patient
                    {SortIcon ? (
                      <SortIcon className="size-3" aria-hidden />
                    ) : (
                      <ArrowUp className="size-3 opacity-30" aria-hidden />
                    )}
                  </Link>
                </TableHead>
                <TableHead>Âge</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>CIN</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5}>
                  <EmptyState
                    icon={Users}
                    title="Aucun patient"
                    description={
                      trimmed
                        ? `Aucun résultat pour « ${trimmed} ».`
                        : 'Créez votre premier patient pour commencer.'
                    }
                  />
                </TableEmpty>
              ) : (
                rows.map((p) => {
                  const fullName = `${p.lastName} ${p.firstName}`;
                  return (
                    <TableRow
                      key={p.id}
                      className={
                        p.isArchived
                          ? 'opacity-60 group/row'
                          : 'group/row cursor-pointer'
                      }
                    >
                      <TableCell className="py-2">
                        <Link
                          href={`/patients/${p.id}`}
                          className="flex items-center gap-3 -mx-3 -my-2 px-3 py-2 focus-visible:outline-none focus-visible:bg-muted/60"
                          aria-label={`Ouvrir le dossier de ${fullName}`}
                        >
                          <Avatar name={fullName} size="md" />
                          <span className="font-medium text-foreground">
                            {fullName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {ageFromDob(p.dateOfBirth)} ans
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {p.phone ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {p.cin ?? '—'}
                      </TableCell>
                      <TableCell className="text-right pr-3">
                        <Link
                          href={`/patients/${p.id}`}
                          className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                          style={{ transitionDuration: 'var(--duration-fast)' }}
                          aria-label={`Ouvrir ${fullName}`}
                        >
                          <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
      </div>
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
