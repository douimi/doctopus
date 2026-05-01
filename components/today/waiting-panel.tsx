import Link from 'next/link';
import type { AppointmentWithPatient } from '@/lib/appointments/queries';
import { ageFromDob } from '@/lib/patients/age';
import { cancelAppointmentAction } from '@/app/(authenticated)/today/actions';

function fmtTime(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function WaitingPanel({ items }: { items: AppointmentWithPatient[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Salle d&apos;attente vide.</p>;
  }
  return (
    <ul className="divide-y border rounded-md">
      {items.map((a, idx) => (
        <li key={a.id} className="p-3 flex items-center gap-3">
          <div className="font-mono text-sm w-8">#{idx + 1}</div>
          <div className="flex-1">
            <Link href={`/patients/${a.patient.id}`} className="font-medium underline">
              {a.patient.lastName} {a.patient.firstName}
            </Link>
            <div className="text-xs text-gray-600">
              {ageFromDob(a.patient.dateOfBirth)} ans · arrivé à {fmtTime(a.arrivedAt)}
              {a.kind === 'walkin' ? ' · walk-in' : ''}
              {a.reason ? ` · ${a.reason}` : ''}
            </div>
          </div>
          <form action={cancelAppointmentAction}>
            <input type="hidden" name="id" value={a.id} />
            <button type="submit" className="text-xs text-red-600 underline">
              annuler
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
