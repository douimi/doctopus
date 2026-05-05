import Link from 'next/link';
import { ChevronRight, Clock, Play, XCircle } from 'lucide-react';
import type { AppointmentWithPatient } from '@/lib/appointments/queries';
import { ageFromDob } from '@/lib/patients/age';
import { cancelAppointmentAction } from '@/app/(authenticated)/today/actions';
import { startConsultationAction } from '@/app/(authenticated)/today/start/actions';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { WaitTime } from './wait-time';

export function WaitingPanel({
  items,
  canStartConsultation,
}: {
  items: AppointmentWithPatient[];
  canStartConsultation: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <EmptyState
          icon={Clock}
          title="Salle d'attente vide"
          description="Les patients arrivés au cabinet apparaîtront ici."
        />
      </div>
    );
  }
  return (
    <ul
      role="list"
      className="divide-y divide-border rounded-xl border border-border bg-card shadow-card overflow-hidden"
    >
      {items.map((a, idx) => {
        const fullName = `${a.patient.lastName} ${a.patient.firstName}`;
        return (
          <li
            key={a.id}
            className="group/row flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            style={{ transitionDuration: 'var(--duration-fast)' }}
          >
            <div className="flex items-center justify-center size-9 shrink-0 rounded-pill bg-warning-tint text-warning-foreground text-small font-semibold tabular-nums">
              {idx + 1}
            </div>
            <Avatar name={fullName} size="md" />
            <div className="flex-1 min-w-0">
              <Link
                href={`/patients/${a.patient.id}`}
                className="inline-flex items-center gap-1 text-body font-medium text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
                style={{ transitionDuration: 'var(--duration-fast)' }}
              >
                <span className="truncate">{fullName}</span>
                <ChevronRight
                  className="size-3 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover/row:opacity-100 group-hover/row:translate-x-0"
                  aria-hidden
                />
              </Link>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-small text-muted-foreground">
                <span className="tabular-nums">
                  {ageFromDob(a.patient.dateOfBirth)} ans
                </span>
                {a.reason ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate">{a.reason}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {a.arrivedAt ? <WaitTime since={a.arrivedAt} /> : null}
              {a.kind === 'walkin' ? (
                <StatusBadge variant="neutral" className="hidden md:inline-flex">
                  Walk-in
                </StatusBadge>
              ) : null}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {canStartConsultation ? (
                <form action={startConsultationAction}>
                  <input type="hidden" name="appointmentId" value={a.id} />
                  <Button
                    type="submit"
                    size="sm"
                    aria-label={`Commencer la consultation de ${fullName}`}
                  >
                    <Play aria-hidden />
                    Commencer
                  </Button>
                </form>
              ) : null}
              <form action={cancelAppointmentAction}>
                <input type="hidden" name="id" value={a.id} />
                <Button
                  type="submit"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Annuler le rendez-vous de ${fullName}`}
                  title="Annuler"
                  className="text-muted-foreground hover:text-danger"
                >
                  <XCircle aria-hidden />
                </Button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
