import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { listPatientConsultationsForPicker } from '@/lib/consultations/queries';
import { getPatientById } from '@/lib/patients/queries';
import { formatAge } from '@/lib/patients/age';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/shell/page-header';
import { walkInFollowUpAction } from '../actions';

type Props = {
  searchParams: Promise<{ patient?: string }>;
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function WalkInSuiviPickerPage({ searchParams }: Props) {
  const session = await requireSession();
  const { patient: patientId } = await searchParams;
  if (!patientId) notFound();

  const patient = await getPatientById(session.tenantId, patientId);
  if (!patient) notFound();
  const fullName = `${patient.lastName} ${patient.firstName}`;

  const candidates = await listPatientConsultationsForPicker(session.tenantId, patient.id);

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href="/today/walk-in"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            style={{ transitionDuration: 'var(--duration-fast)' }}
          >
            <ArrowLeft className="size-3" aria-hidden />
            Walk-in
          </Link>
        }
        title="Suivi en salle d'attente"
        description="Choisissez la consultation à laquelle rattacher ce suivi."
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

          {candidates.length > 0 ? (
            <>
              <p className="text-small text-muted-foreground">
                Le patient sera mis en salle d&apos;attente. Le suivi héritera
                du motif, des antécédents, de l&apos;examen et des constantes
                de la consultation choisie.
              </p>
              <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                {candidates.map((c) => (
                  <li key={c.id}>
                    <form action={walkInFollowUpAction} className="contents">
                      <input type="hidden" name="patientId" value={patient.id} />
                      <input type="hidden" name="parentId" value={c.id} />
                      <button
                        type="submit"
                        className="w-full text-left flex items-start gap-3 px-3 py-3 hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/60 transition-colors"
                        style={{ transitionDuration: 'var(--duration-fast)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-small text-muted-foreground tabular-nums">
                            {fmtDate(c.consultedAt)}
                            {c.isFollowUp ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-foreground/70 text-[10px] uppercase tracking-wide font-medium">
                                Suivi
                              </span>
                            ) : null}
                            {!c.isFinalized ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-warning-tint text-warning-foreground text-[10px] uppercase tracking-wide font-medium">
                                En cours
                              </span>
                            ) : null}
                          </div>
                          <div className="text-foreground line-clamp-1 mt-0.5">
                            {c.motif ?? 'Aucun motif renseigné.'}
                          </div>
                        </div>
                        <ArrowRight
                          className="size-4 text-muted-foreground shrink-0 mt-1"
                          aria-hidden
                        />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Alert variant="warning">
              Ce patient n&apos;a pas encore de consultation enregistrée — un
              suivi ne peut être créé que sur une consultation existante.
              <div className="mt-2">
                <Link
                  href="/today/walk-in"
                  className={buttonVariants({ size: 'sm', variant: 'secondary' })}
                >
                  Walk-in normal à la place
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
