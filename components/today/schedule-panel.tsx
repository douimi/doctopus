import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  UserMinus,
  XCircle,
} from 'lucide-react';
import type { AppointmentWithPatient } from '@/lib/appointments/queries';
import { ageFromDob } from '@/lib/patients/age';
import {
  cancelAppointmentAction,
  markArrivedAction,
  markNoShowAction,
} from '@/app/(authenticated)/today/actions';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';

type StatusKey =
  | 'scheduled'
  | 'waiting'
  | 'in_consultation'
  | 'done'
  | 'cancelled'
  | 'no_show';

const STATUS_LABEL: Record<StatusKey, string> = {
  scheduled: 'Prévu',
  waiting: 'En attente',
  in_consultation: 'En consultation',
  done: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absent',
};

const STATUS_VARIANT: Record<StatusKey, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  scheduled: 'info',
  waiting: 'warning',
  in_consultation: 'info',
  done: 'success',
  cancelled: 'neutral',
  no_show: 'danger',
};

function fmtTime(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function SchedulePanel({ items }: { items: AppointmentWithPatient[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <EmptyState
          icon={Calendar}
          title="Aucun rendez-vous aujourd'hui"
          description="Les nouveaux rendez-vous apparaîtront ici dès leur création."
        />
      </div>
    );
  }
  return (
    <ul
      role="list"
      className="divide-y divide-border rounded-xl border border-border bg-card shadow-card overflow-hidden"
    >
      {items.map((a) => {
        const status = (a.status as StatusKey) ?? 'scheduled';
        const fullName = `${a.patient.lastName} ${a.patient.firstName}`;
        return (
          <li
            key={a.id}
            className="group/row flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            style={{ transitionDuration: 'var(--duration-fast)' }}
          >
            <div className="font-mono text-small text-muted-foreground tabular-nums w-12 shrink-0">
              {fmtTime(a.scheduledAt)}
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
              <div className="text-small text-muted-foreground truncate">
                {ageFromDob(a.patient.dateOfBirth)} ans
                {a.reason ? ` · ${a.reason}` : ''}
              </div>
            </div>
            <StatusBadge variant={STATUS_VARIANT[status]} className="hidden sm:inline-flex">
              {STATUS_LABEL[status]}
            </StatusBadge>
            {status === 'scheduled' ? (
              <div className="flex items-center gap-1 shrink-0">
                <form action={markArrivedAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    aria-label={`Marquer ${fullName} arrivé`}
                  >
                    <CheckCircle2 aria-hidden />
                    Arrivé
                  </Button>
                </form>
                <form action={markNoShowAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <Button
                    type="submit"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Marquer ${fullName} absent`}
                    title="Absent"
                  >
                    <UserMinus aria-hidden />
                  </Button>
                </form>
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
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
