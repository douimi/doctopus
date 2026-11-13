import Link from 'next/link';
import { ArrowRight, Play, Stethoscope } from 'lucide-react';
import type { AppointmentWithPatient, InConsultationRow } from '@/lib/appointments/queries';
import { formatAge } from '@/lib/patients/age';
import { APPOINTMENT_KIND_LABEL } from '@/lib/status-labels';
import { startConsultationAction } from '@/app/(authenticated)/today/start/actions';
import { buttonVariants } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { SubmitButton } from '@/components/ui/submit-button';
import { AppointmentMenu } from './appointment-actions';
import { ColumnEmpty } from './column-empty';
import { WaitTime } from './wait-time';

/**
 * Salle d'attente, in arrival order. The doctor gets a one-tap
 * "Commencer" (with pending state, so a double tap can't start twice);
 * removing someone from the queue is in ⋯ behind a confirm.
 */
export function WaitingPanel({
  items,
  canStartConsultation,
}: {
  items: AppointmentWithPatient[];
  canStartConsultation: boolean;
}) {
  if (items.length === 0) {
    return (
      <ColumnEmpty
        title="Salle d'attente vide"
        description="Les patients arrivés au cabinet apparaîtront ici."
      />
    );
  }
  return (
    <ol role="list" className="panel divide-y divide-border overflow-hidden">
      {items.map((a, idx) => {
        const fullName = `${a.patient.lastName} ${a.patient.firstName}`;
        return (
          <li
            key={a.id}
            className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 transition-colors duration-(--duration-fast) hover:bg-muted/40"
          >
            <div
              className="flex size-7 shrink-0 items-center justify-center rounded-md bg-warning-tint text-small font-semibold tabular-nums text-warning-ink"
              aria-hidden
            >
              {idx + 1}
            </div>
            {/* Narrow phones: the actions wrap under the name instead of crushing it. */}
            <div className="min-w-0 flex-[1_1_9rem]">
              <Link
                href={`/patients/${a.patient.id}`}
                className="block break-words rounded-sm text-body font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {fullName}
              </Link>
              <div className="flex min-w-0 items-center gap-1.5 text-small text-muted-foreground">
                <span className="tabular-nums">{formatAge(a.patient.dateOfBirth)}</span>
                {a.kind === 'walkin' ? (
                  <>
                    <span aria-hidden className="text-subtle-foreground">·</span>
                    <span>{APPOINTMENT_KIND_LABEL.walkin}</span>
                  </>
                ) : null}
                {a.parentConsultationId ? (
                  <>
                    <span aria-hidden className="text-subtle-foreground">·</span>
                    <span>Suivi</span>
                  </>
                ) : null}
                {a.reason ? (
                  <>
                    <span aria-hidden className="text-subtle-foreground">·</span>
                    <span className="truncate">{a.reason}</span>
                  </>
                ) : null}
              </div>
            </div>
            {a.arrivedAt ? <WaitTime since={a.arrivedAt} /> : null}
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {canStartConsultation ? (
                <form action={startConsultationAction}>
                  <input type="hidden" name="appointmentId" value={a.id} />
                  <SubmitButton
                    size="sm"
                    aria-label={`Commencer la consultation de ${fullName}`}
                    className="h-10 lg:h-8"
                  >
                    <Play aria-hidden />
                    Commencer
                  </SubmitButton>
                </form>
              ) : null}
              <AppointmentMenu
                id={a.id}
                fullName={fullName}
                patientId={a.patient.id}
                status="waiting"
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * "En consultation" block at the top of the waiting column. The doctor can
 * jump back into the open consultation; the assistant just sees who's in.
 */
export function InConsultationPanel({
  items,
  canOpenConsultation,
}: {
  items: InConsultationRow[];
  canOpenConsultation: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="in-consultation-title" className="space-y-2">
      <h3 id="in-consultation-title" className="eyebrow flex items-center gap-1.5">
        <Stethoscope className="size-3.5" aria-hidden />
        En consultation
      </h3>
      <ul role="list" className="panel divide-y divide-border overflow-hidden">
        {items.map((a) => {
          const fullName = `${a.patient.lastName} ${a.patient.firstName}`;
          const since = a.startedAt
            ? a.startedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            : null;
          return (
            <li key={a.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
              <span className="size-2 shrink-0 rounded-full bg-info" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="break-words text-body font-medium text-foreground">{fullName}</div>
                <div className="text-small text-muted-foreground tabular-nums">
                  {since ? `Depuis ${since}` : 'En cours'}
                </div>
              </div>
              {canOpenConsultation ? (
                <Link
                  href={`/consultations/${a.consultationId}`}
                  className={buttonVariants({ size: 'sm', variant: 'secondary', className: 'h-10 lg:h-8' })}
                  aria-label={`Reprendre la consultation de ${fullName}`}
                >
                  Reprendre
                  <ArrowRight aria-hidden />
                </Link>
              ) : (
                <StatusBadge variant="info">En consultation</StatusBadge>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
