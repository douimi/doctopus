import Link from 'next/link';
import { CalendarDays, Clock, Plus, Stethoscope } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import {
  listInConsultation,
  listTodaySchedule,
  listWaiting,
} from '@/lib/appointments/queries';
import { buttonVariants } from '@/components/ui/button';
import { SchedulePanel } from '@/components/today/schedule-panel';
import { WaitingPanel } from '@/components/today/waiting-panel';
import { TodayStats } from '@/components/today/today-stats';
import { PageHeader } from '@/components/shell/page-header';
import { Section } from '@/components/ui/section';
import { Avatar } from '@/components/ui/avatar';
import { PaymentsPanel } from '@/components/payments/payments-panel';
import { getPaymentsForToday } from '@/lib/payments/queries';
import { LiveRefresh } from '@/components/shell/live-refresh';

export default async function TodayPage() {
  const session = await requireSession();
  const [schedule, waiting, inConsult, payments] = await Promise.all([
    listTodaySchedule(session.tenantId),
    listWaiting(session.tenantId),
    listInConsultation(session.tenantId),
    getPaymentsForToday(session.tenantId),
  ]);

  // Pending = scheduled & not yet arrived; done = finalised today.
  const pending = schedule.filter((a) => a.status === 'scheduled').length;
  const done = schedule.filter((a) => a.status === 'done').length;

  const paidToday = payments.collectedToday.filter((p) => p.paymentStatus === 'paid');
  const todayRevenueMad = paidToday
    .reduce((sum, p) => sum + Number(p.priceMad ?? 0), 0)
    .toFixed(2);

  return (
    <>
      <LiveRefresh tenantId={session.tenantId} channel="today" />
      <PageHeader
        eyebrow={new Date().toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
        title={`Bonjour ${session.fullName}`}
        description="Voici votre journée."
        actions={
          <>
            <Link
              href="/today/book"
              className={buttonVariants({ variant: 'secondary', size: 'default' })}
            >
              <Plus aria-hidden />
              Rendez-vous
            </Link>
            <Link
              href="/today/walk-in"
              className={buttonVariants({ size: 'default' })}
            >
              <Plus aria-hidden />
              Walk-in
            </Link>
          </>
        }
      />

      <div className="px-6 py-6 space-y-8">
        <TodayStats
          scheduled={pending}
          waiting={waiting.length}
          inConsultation={inConsult.length}
          done={done}
          todayRevenueMad={todayRevenueMad}
          paidCount={paidToday.length}
          awaitingCount={payments.awaiting.length}
        />

        <Section icon={CalendarDays} title="Agenda du jour" count={schedule.length}>
          <SchedulePanel items={schedule} />
        </Section>

        <Section icon={Clock} title="Salle d'attente" count={waiting.length}>
          <WaitingPanel items={waiting} canStartConsultation={session.role === 'doctor'} />
        </Section>

        <PaymentsPanel
          awaiting={payments.awaiting}
          collectedToday={payments.collectedToday}
          role={session.role}
        />

        {inConsult.length > 0 ? (
          <Section
            icon={Stethoscope}
            title="En consultation"
            count={inConsult.length}
          >
            <ul
              role="list"
              className="divide-y divide-border rounded-xl border border-border bg-card shadow-card overflow-hidden"
            >
              {inConsult.map((a) => {
                const fullName = `${a.patient.lastName} ${a.patient.firstName}`;
                return (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={fullName} size="md" tone="primary" />
                    <span className="text-body font-medium">{fullName}</span>
                  </li>
                );
              })}
            </ul>
          </Section>
        ) : null}
      </div>
    </>
  );
}
