import Link from 'next/link';
import type { AppointmentWithPatient } from '@/lib/appointments/queries';
import { ageFromDob } from '@/lib/patients/age';
import {
  cancelAppointmentAction,
  markArrivedAction,
  markNoShowAction,
} from '@/app/(authenticated)/today/actions';

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Prévu',
  waiting: 'En attente',
  in_consultation: 'En consultation',
  done: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absent',
};

function fmtTime(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function SchedulePanel({ items }: { items: AppointmentWithPatient[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Aucun rendez-vous aujourd&apos;hui.</p>;
  }
  return (
    <ul className="divide-y border rounded-md">
      {items.map((a) => (
        <li key={a.id} className="p-3 flex items-center gap-3">
          <div className="font-mono text-sm w-16">{fmtTime(a.scheduledAt)}</div>
          <div className="flex-1">
            <Link href={`/patients/${a.patient.id}`} className="font-medium underline">
              {a.patient.lastName} {a.patient.firstName}
            </Link>
            <div className="text-xs text-gray-600">
              {ageFromDob(a.patient.dateOfBirth)} ans
              {a.reason ? ` · ${a.reason}` : ''}
            </div>
          </div>
          <span className="text-xs rounded bg-gray-100 px-2 py-1">{STATUS_LABEL[a.status]}</span>
          {a.status === 'scheduled' ? (
            <div className="flex gap-2 text-xs">
              <form action={markArrivedAction}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="underline">arrivé</button>
              </form>
              <form action={cancelAppointmentAction}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="text-red-600 underline">annuler</button>
              </form>
              <form action={markNoShowAction}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="text-amber-700 underline">absent</button>
              </form>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
