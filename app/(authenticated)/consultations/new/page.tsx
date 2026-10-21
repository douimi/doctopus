import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { requireDoctor } from '@/lib/auth/guards';
import { getPatientById, searchPatientsPage } from '@/lib/patients/queries';
import { formatAge } from '@/lib/patients/age';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LiveSearchInput } from '@/components/ui/live-search-input';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { Pagination } from '@/components/ui/pagination';
import { CreateConsultationForm } from './create-form';
import { PatientPickerTable } from './patient-picker-table';

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
          width="narrow"
          back={{ href: `/patients/${patientId}`, label: fullName }}
          title="Saisir une consultation passée"
          description="Enregistrez une consultation déjà effectuée hors plateforme. Vous compléterez le dossier ensuite."
        />
        <PageBody width="narrow">
          <Card>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-3">
                <Avatar name={fullName} size="lg" />
                <div className="min-w-0">
                  <div className="truncate text-title font-semibold text-foreground">
                    {fullName}
                  </div>
                  <div className="text-small text-muted-foreground tabular-nums">
                    {formatAge(patient.dateOfBirth)}
                    {patient.phone ? ` · ${patient.phone}` : ''}
                  </div>
                </div>
              </div>
              <CreateConsultationForm patientId={patientId} defaultDate={todayIso()} />
            </CardContent>
          </Card>
        </PageBody>
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
        back={{ href: '/consultations', label: 'Consultations' }}
        title="Saisir une consultation passée"
        description="Choisissez le patient de la consultation à enregistrer."
        actions={
          <Link
            href={`/patients/new?next=${encodeURIComponent('/consultations/new')}`}
            className={buttonVariants({ variant: 'secondary' })}
          >
            <Plus aria-hidden />
            Nouveau patient
          </Link>
        }
      />

      <PageBody>
        <div className="flex flex-wrap items-center gap-2">
          <LiveSearchInput
            defaultQuery={q}
            placeholder="Rechercher : nom, prénom, téléphone, CIN"
          />
          <span className="ml-auto text-small text-muted-foreground tabular-nums">
            {total} patient{total === 1 ? '' : 's'}
            {trimmed ? ` trouvé${total === 1 ? '' : 's'}` : ''}
          </span>
        </div>

        <PatientPickerTable
          rows={rows}
          query={trimmed}
          hrefFor={(id) => `/consultations/new?patient=${id}`}
          actionLabel="Créer une consultation pour"
        />

        <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
      </PageBody>
    </>
  );
}
