import type { ComponentType } from 'react';
import { CalendarDays, CheckCircle2, Clock, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'primary' | 'warning' | 'success' | 'admin';

const TONE: Record<Tone, { wrap: string; icon: string }> = {
  primary: { wrap: 'bg-primary-tint text-primary', icon: 'text-primary' },
  warning: {
    wrap: 'bg-warning-tint text-warning-foreground',
    icon: 'text-warning-foreground',
  },
  success: { wrap: 'bg-success-tint text-success', icon: 'text-success' },
  admin: { wrap: 'bg-admin-tint text-admin', icon: 'text-admin' },
};

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tone: Tone;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-4 flex items-start gap-3 card-hover-lift">
      <div
        aria-hidden
        className={cn(
          'flex items-center justify-center size-10 rounded-lg shrink-0',
          TONE[tone].wrap,
        )}
      >
        <Icon className={cn('size-5', TONE[tone].icon)} aria-hidden />
      </div>
      <div className="space-y-0.5 min-w-0">
        <div className="text-small text-muted-foreground uppercase tracking-wide font-medium">
          {label}
        </div>
        <div className="text-display font-semibold leading-none tabular-nums">
          {value}
        </div>
        {hint ? (
          <div className="text-small text-muted-foreground">{hint}</div>
        ) : null}
      </div>
    </div>
  );
}

export function TodayStats({
  scheduled,
  waiting,
  inConsultation,
  done,
}: {
  scheduled: number;
  waiting: number;
  inConsultation: number;
  done: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatTile
        icon={CalendarDays}
        tone="primary"
        label="Programmés"
        value={scheduled}
        hint={scheduled === 0 ? 'aucun rdv' : scheduled === 1 ? 'rendez-vous' : 'rendez-vous'}
      />
      <StatTile
        icon={Clock}
        tone="warning"
        label="En attente"
        value={waiting}
        hint={waiting === 0 ? 'salle vide' : waiting === 1 ? 'patient' : 'patients'}
      />
      <StatTile
        icon={Stethoscope}
        tone="admin"
        label="En consultation"
        value={inConsultation}
        hint={inConsultation === 1 ? 'en cours' : 'en cours'}
      />
      <StatTile
        icon={CheckCircle2}
        tone="success"
        label="Terminés"
        value={done}
        hint="aujourd'hui"
      />
    </div>
  );
}
