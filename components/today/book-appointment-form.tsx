'use client';

import { useActionState, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DialogBody, DialogFooter } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl, SegmentedControlButton } from '@/components/ui/segmented-control';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { bookAction } from '@/app/(authenticated)/today/book/actions';
import type { BookState } from '@/app/(authenticated)/today/book/types';
import { FollowUpParentField } from './follow-up-parent-field';
import { SelectedPatient, type FlowPatient } from './selected-patient';

const initial: BookState = { error: null };

const QUICK_TIMES = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatHumanDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Booking form for a chosen patient: day (Aujourd'hui / Demain / autre),
 * time (quick slots or free entry), optional motif, optional follow-up
 * parent. Used inside the RDV dialog (over /today and the patient file)
 * and on the /today/book fallback page.
 */
export function BookAppointmentForm({
  patient,
  layout = 'dialog',
  onDone,
  onCancel,
  onChangePatient,
}: {
  patient: FlowPatient;
  layout?: 'dialog' | 'page';
  /** Called once after a successful booking (after the toast). */
  onDone?: () => void;
  onCancel?: () => void;
  /** Shows a "Changer" link next to the patient. */
  onChangePatient?: () => void;
}) {
  const uid = useId();
  const [state, formAction] = useActionState(bookAction, initial);
  const today = useMemo(() => isoDate(new Date()), []);
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return isoDate(d);
  }, []);
  const [date, setDate] = useState(today);
  const [customDay, setCustomDay] = useState(false);
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [followUpBlocking, setFollowUpBlocking] = useState(false);
  const handled = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!state.ok || state.at === handled.current) return;
    handled.current = state.at;
    showToast({
      id: `book-${state.at}`,
      variant: 'success',
      title: 'Rendez-vous planifié',
      description: `${state.patientName ?? patient.fullName} · ${formatHumanDate(date)} à ${time}`,
    });
    onDone?.();
  }, [state, onDone, patient.fullName, date, time]);

  const day: 'today' | 'tomorrow' | 'other' = customDay
    ? 'other'
    : date === today
      ? 'today'
      : date === tomorrow
        ? 'tomorrow'
        : 'other';
  const submitDisabled = !date || !time || followUpBlocking;

  const Body = layout === 'dialog' ? DialogBody : PageBodyPart;
  const Footer = layout === 'dialog' ? DialogFooter : PageFooterPart;

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="patientId" value={patient.id} />
      <Body>
        <SelectedPatient patient={patient} onChange={onChangePatient} />

        <div className="space-y-2">
          <Label>Jour</Label>
          <SegmentedControl label="Jour du rendez-vous">
            <SegmentedControlButton
              active={day === 'today'}
              onClick={() => {
                setCustomDay(false);
                setDate(today);
              }}
            >
              Aujourd&apos;hui
            </SegmentedControlButton>
            <SegmentedControlButton
              active={day === 'tomorrow'}
              onClick={() => {
                setCustomDay(false);
                setDate(tomorrow);
              }}
            >
              Demain
            </SegmentedControlButton>
            <SegmentedControlButton active={day === 'other'} onClick={() => setCustomDay(true)}>
              Autre date
            </SegmentedControlButton>
          </SegmentedControl>
          {day === 'other' ? (
            <FormField label="Date">
              <Input
                id={`${uid}-date`}
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </FormField>
          ) : null}
          <input type="hidden" name="date" value={date} />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor={`${uid}-time`}>Heure</Label>
            <span className="text-small text-muted-foreground first-letter:capitalize">
              {formatHumanDate(date)}
              {time ? ` à ${time}` : ''}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {QUICK_TIMES.map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant="outline"
                aria-pressed={time === t}
                onClick={() => setTime(t)}
                className={cn(
                  'tabular-nums',
                  time === t && 'border-primary/40 bg-primary-tint text-primary-ink hover:bg-primary-tint',
                )}
              >
                {t}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-small text-muted-foreground">ou</span>
            <Input
              id={`${uid}-time`}
              name="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-32 tabular-nums"
            />
          </div>
        </div>

        <FormField label="Motif" optional>
          <Textarea
            id={`${uid}-reason`}
            name="reason"
            rows={2}
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="ex. contrôle tension, renouvellement…"
          />
        </FormField>

        <FollowUpParentField patientId={patient.id} onBlockingChange={setFollowUpBlocking} />

        {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
      </Body>
      <Footer>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        ) : null}
        <SubmitButton disabled={submitDisabled} pendingLabel="Enregistrement…">
          <CalendarPlus aria-hidden />
          Confirmer le rendez-vous
        </SubmitButton>
      </Footer>
    </form>
  );
}

export function PageBodyPart({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5 p-5">{children}</div>;
}

export function PageFooterPart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border bg-canvas px-5 py-3 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}
