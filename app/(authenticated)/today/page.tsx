import { CalendarDays } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import {
  listInConsultationWithIds,
  listTodaySchedule,
  listWaiting,
} from '@/lib/appointments/queries';
import { getPaymentsForToday } from '@/lib/payments/queries';
import { formatMad } from '@/lib/medications/format';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { LiveRefresh } from '@/components/shell/live-refresh';
import { EmptyState } from '@/components/ui/empty-state';
import { BoardColumns, type BoardColumn } from '@/components/today/board-columns';
import { PaymentsColumn, sumMad } from '@/components/today/payments-column';
import { BookAppointmentDialog, WalkInDialog } from '@/components/today/patient-flow-dialogs';
import { SchedulePanel } from '@/components/today/schedule-panel';
import { TodayStats } from '@/components/today/today-stats';
import { InConsultationPanel, WaitingPanel } from '@/components/today/waiting-panel';

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * /today — board: Salle d'attente (primary, wide) · Agenda · À encaisser.
 * RDV and walk-in open as dialogs over the board; LiveRefresh keeps
 * every column in sync through Supabase Realtime.
 */
export default async function TodayPage() {
  const session = await requireSession();
  const isDoctor = session.role === 'doctor';
  const [schedule, waiting, inConsult, payments] = await Promise.all([
    listTodaySchedule(session.tenantId),
    listWaiting(session.tenantId),
    listInConsultationWithIds(session.tenantId),
    getPaymentsForToday(session.tenantId),
  ]);

  // Pending = scheduled & not yet arrived; done = finalised today.
  const pending = schedule.filter((a) => a.status === 'scheduled').length;
  const done = schedule.filter((a) => a.status === 'done').length;

  const paidToday = payments.collectedToday.filter((p) => p.paymentStatus === 'paid');
  const todayRevenueMad = sumMad(paidToday);
  const awaitingMad = sumMad(payments.awaiting);

  const dateLabel = capitalize(
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
  );

  const actions = (
    <>
      <BookAppointmentDialog />
      <WalkInDialog />
    </>
  );

  const nothingYet =
    schedule.length === 0 &&
    waiting.length === 0 &&
    inConsult.length === 0 &&
    payments.awaiting.length === 0 &&
    payments.collectedToday.length === 0;

  const waitingColumn: BoardColumn = {
    key: 'attente',
    title: "Salle d'attente",
    shortLabel: 'Attente',
    count: waiting.length,
    content: (
      <div className="space-y-4">
        <InConsultationPanel items={inConsult} canOpenConsultation={isDoctor} />
        <WaitingPanel items={waiting} canStartConsultation={isDoctor} />
      </div>
    ),
  };
  const agendaColumn: BoardColumn = {
    key: 'agenda',
    title: 'Agenda du jour',
    shortLabel: 'Agenda',
    count: schedule.length,
    aside: pending > 0 ? `${pending} à venir` : undefined,
    content: <SchedulePanel items={schedule} />,
  };
  const paymentsColumn: BoardColumn = {
    key: 'paiements',
    title: 'À encaisser',
    shortLabel: 'Paiements',
    count: payments.awaiting.length,
    aside:
      payments.awaiting.length > 0 ? (
        <span className="font-medium text-warning-ink tabular-nums">{formatMad(awaitingMad)}</span>
      ) : undefined,
    content: (
      <PaymentsColumn awaiting={payments.awaiting} collectedToday={payments.collectedToday} />
    ),
  };

  // The waiting room is the board's priority for both roles: it gets the
  // wide primary column, agenda and payments stack beside it.
  const columns = [waitingColumn, agendaColumn, paymentsColumn];

  return (
    <>
      <LiveRefresh tenantId={session.tenantId} channel="today" />
      <PageHeader eyebrow="Aujourd'hui" title={dateLabel} actions={actions} />

      <PageBody>
        <TodayStats
          scheduled={pending}
          waitingSince={waiting.map((w) => w.arrivedAt ?? w.createdAt)}
          inConsultation={inConsult.length}
          done={done}
          todayRevenueMad={todayRevenueMad}
          awaitingCount={payments.awaiting.length}
          awaitingMad={awaitingMad}
        />

        {nothingYet ? (
          <div className="panel">
            <EmptyState
              icon={CalendarDays}
              title="Journée vide pour l'instant"
              description="Planifiez un rendez-vous ou mettez un patient arrivé sans RDV en salle d'attente."
              action={<div className="flex flex-wrap justify-center gap-2">{actions}</div>}
            />
          </div>
        ) : (
          <BoardColumns columns={columns} />
        )}
      </PageBody>
    </>
  );
}
