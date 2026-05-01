import Link from 'next/link';
import { requireSession } from '@/lib/auth/session';
import {
  listInConsultation,
  listTodaySchedule,
  listWaiting,
} from '@/lib/appointments/queries';
import { buttonVariants } from '@/components/ui/button';
import { SchedulePanel } from '@/components/today/schedule-panel';
import { WaitingPanel } from '@/components/today/waiting-panel';

export default async function TodayPage() {
  const session = await requireSession();
  const [schedule, waiting, inConsult] = await Promise.all([
    listTodaySchedule(session.tenantId),
    listWaiting(session.tenantId),
    listInConsultation(session.tenantId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Bonjour {session.fullName}</h1>
        <div className="flex gap-2">
          <Link href="/today/book" className={buttonVariants({ variant: 'secondary' })}>
            + Rendez-vous
          </Link>
          <Link href="/today/walk-in" className={buttonVariants()}>
            + Walk-in
          </Link>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Agenda du jour</h2>
        <SchedulePanel items={schedule} />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Salle d&apos;attente</h2>
        <WaitingPanel items={waiting} canStartConsultation={session.role === 'doctor'} />
      </section>

      {inConsult.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-medium">En consultation</h2>
          <ul className="divide-y border rounded-md">
            {inConsult.map((a) => (
              <li key={a.id} className="p-3 text-sm">
                {a.patient.lastName} {a.patient.firstName}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
