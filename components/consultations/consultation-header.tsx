import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { formatAge } from '@/lib/patients/age';
import {
  AiToggle,
  BackLink,
  ContextSheetTrigger,
  HeaderOverflowMenu,
  SaveIndicator,
} from './header-controls';

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Compact sticky header for the consultation cockpit. Replaces the
 * PageHeader + PatientCard pair: identity, allergies (always visible,
 * at every breakpoint), date, follow-up link, save state, and the one
 * primary action. Destructive actions live in the overflow menu.
 */
export function ConsultationHeader({
  consultationId,
  patient,
  allergies,
  consultedAt,
  parent,
  isFinalized,
  isPaid,
  primaryAction,
  aiUnavailableReason,
  historySummary,
  historyCount,
}: {
  consultationId: string;
  patient: {
    id: string;
    fullName: string;
    dateOfBirth: string | null;
    gender: string;
  };
  allergies: string[];
  consultedAt: Date;
  parent: { id: string; consultedAt: Date } | null;
  isFinalized: boolean;
  isPaid: boolean;
  /** FinalizePricingDialog (draft) or the tarification badge (finalized). */
  primaryAction: ReactNode;
  aiUnavailableReason: string | null;
  /** One-line antécédents summary shown below lg (the rail is a sheet there). */
  historySummary: string | null;
  historyCount: number;
}) {
  return (
    <header
      data-cockpit-header
      className="sticky top-14 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 md:top-0"
    >
      <div className="flex flex-col gap-2 px-4 py-2.5 md:px-8">
        <div className="flex items-center gap-2">
          <BackLink />
          <div className="min-w-0 flex-1">
            <h1 className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="truncate text-title font-semibold text-foreground">
                {patient.fullName}
              </span>
              <span className="text-small text-muted-foreground tabular-nums">
                {formatAge(patient.dateOfBirth)} · {patient.gender === 'm' ? 'H' : 'F'}
              </span>
            </h1>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-small text-muted-foreground">
              <span className="tabular-nums">
                {isFinalized ? 'Clôturée' : 'Consultation'} du {fmtDate(consultedAt)}
              </span>
              {parent ? (
                <Link
                  href={`/consultations/${parent.id}`}
                  className="inline-flex items-center gap-1 rounded-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <RefreshCw className="size-3.5" aria-hidden />
                  Suivi du {fmtDate(parent.consultedAt)}
                </Link>
              ) : null}
              <SaveIndicator
                className="hidden max-w-80 sm:inline-flex"
                idleLabel={isFinalized ? 'Lecture seule' : 'Brouillon enregistré'}
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <AiToggle unavailableReason={aiUnavailableReason} />
            {primaryAction}
            <HeaderOverflowMenu
              consultationId={consultationId}
              patientId={patient.id}
              patientFullName={patient.fullName}
              isPaid={isPaid}
              canCreateFollowUp={isFinalized}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {allergies.length > 0 ? (
            allergies.map((a) => (
              <span
                key={a}
                className="inline-flex h-6 items-center gap-1 rounded-md bg-danger-tint px-2 text-small font-medium text-danger-ink ring-1 ring-inset ring-danger/25"
              >
                <AlertTriangle className="size-3.5" aria-hidden />
                Allergie : {a}
              </span>
            ))
          ) : (
            <span className="inline-flex h-6 items-center gap-1 rounded-md bg-muted px-2 text-small text-muted-foreground ring-1 ring-inset ring-border">
              <AlertTriangle className="size-3.5" aria-hidden />
              Aucune allergie connue
            </span>
          )}
          <SaveIndicator
            className="ml-auto sm:hidden"
            idleLabel={isFinalized ? 'Lecture seule' : 'Brouillon enregistré'}
          />
        </div>

        <ContextSheetTrigger summary={historySummary} historyCount={historyCount} />
      </div>
    </header>
  );
}
