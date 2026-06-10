import Link from 'next/link';
import { ArrowLeft, Plus, UserSearch } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { searchPatientsPage } from '@/lib/patients/queries';
import { formatAge } from '@/lib/patients/age';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LiveSearchInput } from '@/components/ui/live-search-input';
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
import { PageHeader } from '@/components/shell/page-header';
import { BookAppointmentDialog } from './book-dialog';

const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function BookPage({ searchParams }: Props) {
  const session = await requireSession();
  const { q = '', page: pageRaw } = await searchParams;
  const trimmed = q.trim();
  const requestedPage = Number.parseInt(pageRaw ?? '1', 10) || 1;
  const { rows, total, page, totalPages } = await searchPatientsPage(
    session.tenantId,
    trimmed,
    { page: requestedPage, pageSize: PAGE_SIZE },
  );

  const buildHref = (n: number) => {
    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    if (n > 1) params.set('page', String(n));
    const qs = params.toString();
    return qs ? `/today/book?${qs}` : '/today/book';
  };

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/today"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            style={{ transitionDuration: 'var(--duration-fast)' }}
          >
            <ArrowLeft className="size-3" aria-hidden />
            Aujourd&apos;hui
          </Link>
        }
        title="Nouveau rendez-vous"
        description="Choisissez un patient pour planifier un rendez-vous."
      />

      <div className="px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LiveSearchInput
            defaultQuery={q}
            placeholder="Rechercher : nom, prénom, téléphone, CIN"
          />
          <Link
            href={`/patients/new?next=${encodeURIComponent('/today/book')}`}
            className={buttonVariants()}
          >
            <Plus aria-hidden />
            Nouveau patient
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
                <TableHead>Patient</TableHead>
                <TableHead>Âge</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>CIN</TableHead>
                <TableHead className="text-right pr-3">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5}>
                  <EmptyState
                    icon={UserSearch}
                    title={trimmed ? 'Aucun résultat' : 'Aucun patient enregistré'}
                    description={
                      trimmed
                        ? `Aucun patient ne correspond à « ${trimmed} ».`
                        : 'Créez un patient pour commencer.'
                    }
                  />
                </TableEmpty>
              ) : (
                rows.map((p) => {
                  const fullName = `${p.lastName} ${p.firstName}`;
                  const ageLabel = formatAge(p.dateOfBirth);
                  return (
                    <TableRow key={p.id} className="group/row">
                      <TableCell className="py-2">
                        <Link
                          href={`/patients/${p.id}`}
                          className="flex items-center gap-3 -mx-3 -my-2 px-3 py-2 focus-visible:outline-none focus-visible:bg-muted/60 hover:text-primary transition-colors"
                          aria-label={`Ouvrir le dossier de ${fullName}`}
                        >
                          <Avatar name={fullName} size="md" />
                          <span className="font-medium text-foreground group-hover/row:text-primary transition-colors">
                            {fullName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {ageLabel}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {p.phone ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {p.cin ?? '—'}
                      </TableCell>
                      <TableCell className="text-right pr-3">
                        <BookAppointmentDialog
                          patientId={p.id}
                          fullName={fullName}
                          ageLabel={ageLabel}
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
      </div>
    </>
  );
}
