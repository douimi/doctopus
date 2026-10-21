import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatMad } from '@/lib/medications/format';
import { LongestWait } from './wait-time';

function Kpi({
  label,
  value,
  hint,
  attention = false,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Warning colour + leading bar: only when the number needs action. */
  attention?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex min-w-0 flex-col justify-center bg-card px-4 py-2.5',
        attention && 'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-warning',
        className,
      )}
    >
      <dt className="eyebrow truncate">{label}</dt>
      <dd className="flex items-baseline gap-2">
        <span
          className={cn(
            'text-title font-semibold tabular-nums',
            attention ? 'text-warning-ink' : 'text-foreground',
          )}
        >
          {value}
        </span>
        {hint ? (
          <span className="truncate text-small text-muted-foreground tabular-nums">{hint}</span>
        ) : null}
      </dd>
    </div>
  );
}

/**
 * One slim KPI strip for the /today board (UX brief §3.2). Neutral by
 * default; only "En attente" and unpaid money turn warning when > 0.
 */
export function TodayStats({
  scheduled,
  waitingSince,
  inConsultation,
  done,
  todayRevenueMad,
  awaitingCount,
  awaitingMad,
}: {
  scheduled: number;
  /** arrivedAt of everyone in the waiting room (drives count + longest wait). */
  waitingSince: Date[];
  inConsultation: number;
  done: number;
  todayRevenueMad: string;
  awaitingCount: number;
  awaitingMad: string;
}) {
  const waiting = waitingSince.length;
  return (
    <dl
      aria-label="Résumé de la journée"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-card sm:grid-cols-3 lg:grid-cols-5"
    >
      <Kpi label="Prévus" value={scheduled} hint={scheduled === 0 ? 'aucun RDV' : 'à venir'} />
      <Kpi
        label="En attente"
        value={waiting}
        attention={waiting > 0}
        hint={waiting > 0 ? <LongestWait since={waitingSince} /> : 'salle vide'}
      />
      <Kpi label="En consult." value={inConsultation} />
      <Kpi label="Terminés" value={done} />
      <Kpi
        label="Recettes"
        value={formatMad(todayRevenueMad)}
        className="col-span-2 sm:col-span-2 lg:col-span-1"
        hint={
          awaitingCount > 0 ? (
            <span className="text-warning-ink">
              {formatMad(awaitingMad)} à encaisser
            </span>
          ) : (
            'tout est encaissé'
          )
        }
      />
    </dl>
  );
}
