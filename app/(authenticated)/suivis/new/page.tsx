import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Plus, RefreshCw, UserSearch } from 'lucide-react';
import { requireDoctor } from '@/lib/auth/guards';
import { getLatestPrimaryConsultationForPatient } from '@/lib/consultations/queries';
import { getPatientById, searchPatientsPage } from '@/lib/patients/queries';
import { formatAge } from '@/lib/patients/age';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { createFollowUpAction } from '@/app/(authenticated)/consultations/[id]/actions';

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

  // Mode 1 — patient pre-selected: look up the most recent primary
  // consultation and prompt to confirm. If the patient has nothing on
  // file, fall through to an explanatory empty state.
  if (patientId) {
    const patient = await getPatientById(session.tenantId, patientId);
    if (!patient) notFound();
    const fullName = `${patient.lastName} ${patient.firstName}`;
    const parent = await getLatestPrimaryConsultationForPatient(
      session.tenantId,
      patient.id,
    );

    return (
      <>
        <PageHeader
          eyebrow={
            <Link
              href="/suivis/new"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              style={{ transitionDuration: 'var(--duration-fast)' }}
            >
              <ArrowLeft className="size-3" aria-hidden />
              Choisir un autre patient
            </Link>
          }
          title="Nouveau suivi"
          description="Enregistrez une visite de contrôle rattachée à une consultation précédente."
        />
        <div className="px-6 py-6 max-w-2xl space-y-4">
          <div className="rounded-xl border border-border bg-card shadow-card p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={fullName} size="md" />
              <div className="min-w-0">
                <div className="font-medium text-foreground">{fullName}</div>
                <div className="text-small text-muted-foreground tabular-nums">
                  {formatAge(patient.dateOfBirth)}
                  {patient.phone ? ` · ${patient.phone}` : ''}
                </div>
              </div>
            </div>

            {parent ? (
              <>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-small">
                  <div className="font-medium text-foreground mb-0.5">
                    Rattaché à la consultation du {fmtDate(parent.consultedAt)}
                  </div>
                  <div className="text-muted-foreground line-clamp-2">
                    {parent.motif ?? 'Aucun motif renseigné.'}
                  </div>
                  <Link
                    href={`/consultations/${parent.id}`}
                    className="inline-flex items-center gap-1 mt-1.5 text-foreground/80 hover:text-primary transition-colors"
                    style={{ transitionDuration: 'var(--duration-fast)' }}
                  >
                    Voir la consultation parente
                    <ArrowRight className="size-3" aria-hidden />
                  </Link>
                </div>

                <p className="text-small text-muted-foreground">
                  Le motif, les antécédents, l&apos;examen et le diagnostic
                  seront repris automatiquement &mdash; vous pourrez les
                  modifier dans l&apos;éditeur.
                </p>

                <form action={createFollowUpAction}>
                  <input type="hidden" name="parentId" value={parent.id} />
                  <Button type="submit" className="w-full sm:w-auto">
                    <RefreshCw aria-hidden />
                    Créer le suivi
                  </Button>
                </form>
              </>
            ) : (
              <Alert variant="warning">
                Ce patient n&apos;a pas encore de consultation enregistrée — un
                suivi ne peut être créé que sur une consultation existante.
                Commencez par créer une consultation, puis revenez ici.
                <div className="mt-2">
                  <Link
                    href={`/consultations/new?patient=${patient.id}`}
                    className={buttonVariants({ size: 'sm', variant: 'secondary' })}
                  >
                    Nouvelle consultation
                    <ArrowRight aria-hidden />
                  </Link>
                </div>
              </Alert>
            )}
          </div>
        </div>
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
        eyebrow={
          <Link
            href="/suivis"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            style={{ transitionDuration: 'var(--duration-fast)' }}
          >
            <ArrowLeft className="size-3" aria-hidden />
            Suivis
          </Link>
        }
        title="Nouveau suivi"
        description="Choisissez le patient à suivre — la consultation parente est récupérée automatiquement."
      />

      <div className="px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LiveSearchInput
            defaultQuery={q}
            placeholder="Rechercher : nom, prénom, téléphone, CIN"
          />
          <Link
            href="/patients/new?next=/suivis/new"
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
                          href={`/suivis/new?patient=${p.id}`}
                          className="flex items-center gap-3 -mx-3 -my-2 px-3 py-2 focus-visible:outline-none focus-visible:bg-muted/60 hover:text-primary transition-colors"
                          aria-label={`Créer un suivi pour ${fullName}`}
                        >
                          <Avatar name={fullName} size="md" />
                          <span className="font-medium text-foreground group-hover/row:text-primary transition-colors">
                            {fullName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {formatAge(p.dateOfBirth)}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {p.phone ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {p.cin ?? '—'}
                      </TableCell>
                      <TableCell className="text-right pr-3">
                        <Link
                          href={`/suivis/new?patient=${p.id}`}
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
