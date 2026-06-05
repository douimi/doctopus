import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Plus, UserSearch } from 'lucide-react';
import { requireDoctor } from '@/lib/auth/guards';
import { getPatientById, searchPatientsPage } from '@/lib/patients/queries';
import { ageFromDob } from '@/lib/patients/age';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
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
import { CreateConsultationForm } from './create-form';

const PAGE_SIZE = 25;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Props = {
  searchParams: Promise<{ q?: string; page?: string; patient?: string }>;
};

export default async function NewConsultationPage({ searchParams }: Props) {
  const session = await requireDoctor();
  const { q = '', page: pageRaw, patient: patientId } = await searchParams;

  // Mode 1 — patient pre-selected: render the date form for that patient.
  if (patientId) {
    const patient = await getPatientById(session.tenantId, patientId);
    if (!patient) notFound();
    const fullName = `${patient.lastName} ${patient.firstName}`;
    return (
      <>
        <PageHeader
          eyebrow={
            <Link
              href={`/patients/${patientId}`}
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              style={{ transitionDuration: 'var(--duration-fast)' }}
            >
              <ArrowLeft className="size-3" aria-hidden />
              {fullName}
            </Link>
          }
          title="Nouvelle consultation"
          description="Enregistrez une consultation effectuée hors plateforme."
        />
        <div className="px-6 py-6 max-w-2xl space-y-4">
          <div className="rounded-xl border border-border bg-card shadow-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={fullName} size="md" />
              <div className="min-w-0">
                <div className="font-medium text-foreground">{fullName}</div>
                <div className="text-small text-muted-foreground tabular-nums">
                  {ageFromDob(patient.dateOfBirth)} ans
                  {patient.phone ? ` · ${patient.phone}` : ''}
                </div>
              </div>
            </div>
            <CreateConsultationForm patientId={patientId} defaultDate={todayIso()} />
          </div>
        </div>
      </>
    );
  }

  // Mode 2 — patient search.
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
    return qs ? `/consultations/new?${qs}` : '/consultations/new';
  };

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/consultations"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            style={{ transitionDuration: 'var(--duration-fast)' }}
          >
            <ArrowLeft className="size-3" aria-hidden />
            Consultations
          </Link>
        }
        title="Nouvelle consultation"
        description="Choisissez un patient pour enregistrer une consultation."
      />

      <div className="px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LiveSearchInput
            defaultQuery={q}
            placeholder="Rechercher : nom, prénom, téléphone, CIN"
          />
          <Link
            href={`/patients/new?next=${encodeURIComponent('/consultations/new')}`}
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
                  return (
                    <TableRow key={p.id} className="group/row">
                      <TableCell className="py-2">
                        <Link
                          href={`/consultations/new?patient=${p.id}`}
                          className="flex items-center gap-3 -mx-3 -my-2 px-3 py-2 focus-visible:outline-none focus-visible:bg-muted/60 hover:text-primary transition-colors"
                          aria-label={`Créer une consultation pour ${fullName}`}
                        >
                          <Avatar name={fullName} size="md" />
                          <span className="font-medium text-foreground group-hover/row:text-primary transition-colors">
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
                          href={`/consultations/new?patient=${p.id}`}
                          className={buttonVariants({ size: 'sm' })}
                          aria-label={`Choisir ${fullName}`}
                        >
                          Choisir
                          <ArrowRight aria-hidden />
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
