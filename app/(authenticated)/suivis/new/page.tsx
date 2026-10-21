import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Plus } from 'lucide-react';
import { requireDoctor } from '@/lib/auth/guards';
import { listPatientConsultationsForPicker } from '@/lib/consultations/queries';
import { getPatientById, searchPatientsPage } from '@/lib/patients/queries';
import { formatAge } from '@/lib/patients/age';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LiveSearchInput } from '@/components/ui/live-search-input';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { createFollowUpAction } from '@/app/(authenticated)/consultations/[id]/actions';
import { PatientPickerTable } from '@/app/(authenticated)/consultations/new/patient-picker-table';

const PAGE_SIZE = 25;

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type Props = {
  searchParams: Promise<{ q?: string; page?: string; patient?: string }>;
};

export default async function NewFollowUpPage({ searchParams }: Props) {
  const session = await requireDoctor();
  const { q = '', page: pageRaw, patient: patientId } = await searchParams;

  // Mode 1 — patient pre-selected: list every consultation the patient
  // has on file and let the doctor pick which one to attach the
  // follow-up to. (Auto-picking the latest is wrong when the patient
  // has multiple concurrent issues — the doctor needs to choose.)
  if (patientId) {
    const patient = await getPatientById(session.tenantId, patientId);
    if (!patient) notFound();
    const fullName = `${patient.lastName} ${patient.firstName}`;
    const candidates = await listPatientConsultationsForPicker(session.tenantId, patient.id);

    return (
      <>
        <PageHeader
          width="narrow"
          back={{ href: '/suivis/new', label: 'Choisir un autre patient' }}
          title="Nouveau suivi"
          description="Étape 2 sur 2 — choisissez la consultation à laquelle rattacher ce suivi."
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

              {candidates.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-small text-muted-foreground">
                    Le motif, les antécédents, l&apos;examen et les constantes
                    de la consultation choisie seront repris &mdash; vous
                    pourrez tout modifier ensuite.
                  </p>
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {candidates.map((c) => (
                      <li key={c.id}>
                        <form action={createFollowUpAction} className="contents">
                          <input type="hidden" name="parentId" value={c.id} />
                          <button
                            type="submit"
                            className="group/row flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-(--duration-fast) hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-small text-muted-foreground tabular-nums">
                                {fmtDate(c.consultedAt)}
                                {c.isFollowUp ? (
                                  <StatusBadge variant="neutral">Suivi</StatusBadge>
                                ) : null}
                                {!c.isFinalized ? (
                                  <StatusBadge variant="info" dot>
                                    En cours
                                  </StatusBadge>
                                ) : null}
                              </div>
                              <div className="mt-0.5 line-clamp-1 text-body text-foreground">
                                {c.motif ?? 'Aucun motif renseigné.'}
                              </div>
                            </div>
                            <ArrowRight
                              className="size-4 shrink-0 text-subtle-foreground transition-colors duration-(--duration-fast) group-hover/row:text-primary"
                              aria-hidden
                            />
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <Alert variant="warning" title="Aucune consultation à suivre">
                  Un suivi se rattache toujours à une consultation existante.
                  Enregistrez d&apos;abord une consultation pour ce patient, puis
                  revenez ici.
                  <div className="mt-2">
                    <Link
                      href={`/consultations/new?patient=${patient.id}`}
                      className={buttonVariants({ size: 'sm', variant: 'secondary' })}
                    >
                      Saisir une consultation
                      <ArrowRight aria-hidden />
                    </Link>
                  </div>
                </Alert>
              )}
            </CardContent>
          </Card>
        </PageBody>
      </>
    );
  }

  // Mode 2 — patient picker.
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
    return qs ? `/suivis/new?${qs}` : '/suivis/new';
  };

  return (
    <>
      <PageHeader
        back={{ href: '/consultations?type=suivi', label: 'Suivis' }}
        title="Nouveau suivi"
        description="Étape 1 sur 2 — choisissez le patient, puis la consultation à suivre."
        actions={
          <Link
            href="/patients/new?next=/suivis/new"
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
          hrefFor={(id) => `/suivis/new?patient=${id}`}
          actionLabel="Créer un suivi pour"
        />

        <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
      </PageBody>
    </>
  );
}
