import Link from 'next/link';
import type { AppointmentWithPatient } from '@/lib/appointments/queries';
import { formatAge } from '@/lib/patients/age';
import { appointmentStatus } from '@/lib/status-labels';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { AppointmentMenu, ArriveButton } from './appointment-actions';
import { ColumnEmpty } from './column-empty';

function fmtTime(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Agenda du jour: today's booked appointments in time order. "Arrivé" is
 * one tap; Absent / Annuler live in the row's ⋯ menu behind a confirm.
 * Closed rows (terminé, annulé, absent) are dimmed so the open ones stand out.
 */
export function SchedulePanel({ items }: { items: AppointmentWithPatient[] }) {
  if (items.length === 0) {
    return (
      <ColumnEmpty
        title="Aucun rendez-vous aujourd'hui"
        description="Les rendez-vous planifiés pour aujourd'hui apparaîtront ici."
      />
    );
  }
  return (
    <ul role="list" className="panel divide-y divide-border overflow-hidden">
      {items.map((a) => {
        const status = appointmentStatus(a.status);
        const fullName = `${a.patient.lastName} ${a.patient.firstName}`;
        const time = fmtTime(a.scheduledAt);
        const closed = a.status === 'done' || a.status === 'cancelled' || a.status === 'no_show';
        return (
          <li
            key={a.id}
            className={cn(
              'flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-(--duration-fast) hover:bg-muted/40',
              closed && 'text-muted-foreground',
            )}
          >
            <div
              className={cn(
                'w-12 shrink-0 text-small font-medium tabular-nums',
                closed ? 'text-muted-foreground line-through decoration-border-strong' : 'text-foreground',
              )}
            >
              {time}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/patients/${a.patient.id}`}
                className={cn(
                  'block truncate rounded-sm text-body font-medium hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  closed ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {fullName}
              </Link>
              <div className="flex items-center gap-1.5 truncate text-small text-muted-foreground">
                <span className="tabular-nums">{formatAge(a.patient.dateOfBirth)}</span>
                {a.reason ? (
                  <>
                    <span aria-hidden className="text-subtle-foreground">·</span>
                    <span className="truncate">{a.reason}</span>
                  </>
                ) : null}
                {a.parentConsultationId ? (
                  <>
                    <span aria-hidden className="text-subtle-foreground">·</span>
                    <span>Suivi</span>
                  </>
                ) : null}
              </div>
            </div>
            <StatusBadge variant={status.tone} dot className="hidden sm:inline-flex">
              {status.label}
            </StatusBadge>
            <span className="sr-only sm:hidden">{status.label}</span>
            {a.status === 'scheduled' ? (
              <div className="flex shrink-0 items-center gap-1">
                <ArriveButton id={a.id} fullName={fullName} />
                <AppointmentMenu
                  id={a.id}
                  fullName={fullName}
                  patientId={a.patient.id}
                  status="scheduled"
                  timeLabel={time}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
