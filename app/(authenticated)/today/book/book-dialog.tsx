'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CalendarPlus, Clock } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { FollowUpParentCandidate } from '@/lib/consultations/queries';
import { bookAction, listFollowUpParentCandidatesAction } from './actions';
import type { BookState } from './types';

const initial: BookState = { error: null };

const QUICK_TIMES = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatHumanDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={disabled}>
      <CalendarPlus aria-hidden />
      Confirmer le rendez-vous
    </Button>
  );
}

export function BookAppointmentDialog({
  patientId,
  fullName,
  ageLabel,
  triggerLabel = 'Planifier un RDV',
}: {
  patientId: string;
  fullName: string;
  ageLabel: string;
  triggerLabel?: string;
}) {
  const [state, action] = useActionState(bookAction, initial);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState('');
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [parentId, setParentId] = useState('');
  const [parents, setParents] = useState<FollowUpParentCandidate[] | null>(null);
  const [parentsLoading, setParentsLoading] = useState(false);

  const today = useMemo(() => todayIso(), []);
  const tomorrow = useMemo(() => tomorrowIso(), []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Reset on open so reopening doesn't keep stale values.
      setDate(today);
      setTime('');
      setIsFollowUp(false);
      setParentId('');
      setParents(null);
    }
  }

  // Lazy-load the patient's consultations the first time the doctor
  // ticks "C'est un suivi". Re-uses the cached list on subsequent toggles.
  useEffect(() => {
    if (!isFollowUp || parents !== null || parentsLoading) return;
    setParentsLoading(true);
    void listFollowUpParentCandidatesAction(patientId)
      .then((rows) => {
        setParents(rows);
        if (rows.length > 0) setParentId(rows[0].id);
      })
      .finally(() => setParentsLoading(false));
  }, [isFollowUp, parents, parentsLoading, patientId]);

  const noEligibleParent = isFollowUp && parents !== null && parents.length === 0;
  const submitDisabled =
    !date || !time || (isFollowUp && (parentsLoading || noEligibleParent || !parentId));

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => handleOpenChange(true)}
        aria-label={`${triggerLabel} pour ${fullName}`}
      >
        <CalendarPlus aria-hidden />
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={fullName} size="lg" tone="primary" />
            <div className="min-w-0">
              <DialogTitle className="truncate">{fullName}</DialogTitle>
              <DialogDescription>
                {ageLabel} · planifier un nouveau rendez-vous
              </DialogDescription>
            </div>
          </div>

          <form action={action} className="space-y-4">
            <input type="hidden" name="patientId" value={patientId} />

            <div className="space-y-2">
              <Label>Quand</Label>
              <div className="inline-flex items-center gap-1 p-0.5 rounded-pill border border-border bg-muted">
                <DateChip
                  active={date === today}
                  onClick={() => setDate(today)}
                  label="Aujourd’hui"
                />
                <DateChip
                  active={date === tomorrow}
                  onClick={() => setDate(tomorrow)}
                  label="Demain"
                />
                <DateChip
                  active={date !== today && date !== tomorrow}
                  onClick={() => {
                    /* keep current custom date; chip is only for visual */
                  }}
                  label="Plus tard…"
                  asLabel
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="date" className="text-small">
                    Date
                  </Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={date}
                    min={today}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="time" className="text-small">
                    Heure
                  </Label>
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <p className="text-small text-muted-foreground">
                {formatHumanDate(date)}
                {time ? ` à ${time}` : ''}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" aria-hidden />
                Heures fréquentes
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TIMES.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTime(t)}
                    aria-pressed={time === t}
                    className={cn(
                      'px-2.5 py-1 rounded-pill border text-small transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 tabular-nums',
                      time === t
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-card text-foreground border-border hover:bg-muted',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="reason">Motif (optionnel)</Label>
              <Textarea
                id="reason"
                name="reason"
                rows={2}
                placeholder="ex. suivi, contrôle…"
              />
            </div>

            <input
              type="hidden"
              name="parentConsultationId"
              value={isFollowUp ? parentId : ''}
            />
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer text-small">
                <input
                  type="checkbox"
                  checked={isFollowUp}
                  onChange={(e) => setIsFollowUp(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-border"
                />
                <span>
                  <span className="font-medium">C&apos;est un suivi</span>{' '}
                  <span className="text-muted-foreground">
                    — gratuit par défaut, motif / antécédents / examen /
                    constantes pré-remplis.
                  </span>
                </span>
              </label>
              {isFollowUp ? (
                parentsLoading ? (
                  <p className="text-small text-muted-foreground ml-6">
                    Chargement des consultations précédentes…
                  </p>
                ) : noEligibleParent ? (
                  <p className="text-small text-warning-foreground ml-6">
                    Aucune consultation précédente pour ce patient.
                  </p>
                ) : (
                  <div className="ml-6 space-y-1">
                    <Label htmlFor="parent-id" className="text-small">
                      Consultation parente
                    </Label>
                    <select
                      id="parent-id"
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-card text-body focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                    >
                      {(parents ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {new Date(c.consultedAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                          {c.isFollowUp ? ' · Suivi' : ''}
                          {' — '}
                          {c.motif ?? 'Motif non renseigné'}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              ) : null}
            </div>

            {state.error ? <Alert variant="danger">{state.error}</Alert> : null}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
              >
                Annuler
              </Button>
              <Submit disabled={submitDisabled} />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DateChip({
  active,
  onClick,
  label,
  asLabel = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  asLabel?: boolean;
}) {
  if (asLabel) {
    return (
      <span
        className={cn(
          'px-3 py-1 rounded-pill text-small font-medium',
          active
            ? 'bg-card text-foreground shadow-card'
            : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'px-3 py-1 rounded-pill text-small font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
        active
          ? 'bg-card text-foreground shadow-card'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}
