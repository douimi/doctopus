'use client';

import { useCallback, useState, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PatientPicker } from '@/components/patients/patient-picker';
import { BookAppointmentForm } from './book-appointment-form';
import { WalkInForm } from './walk-in-form';
import type { FlowPatient } from './selected-patient';

type TriggerProps = {
  triggerLabel?: string;
  triggerVariant?: ComponentProps<typeof Button>['variant'];
  triggerSize?: ComponentProps<typeof Button>['size'];
  triggerClassName?: string;
};

type FlowProps = TriggerProps & {
  /** Fixed patient (patient file, picker page). Omit to pick one first. */
  patient?: FlowPatient;
  /** Navigate here after success (fallback pages). Default: stay and let revalidation refresh. */
  successHref?: string;
};

function FlowDialog({
  kind,
  patient: fixedPatient,
  successHref,
  triggerLabel,
  triggerVariant,
  triggerSize = 'default',
  triggerClassName,
}: FlowProps & { kind: 'book' | 'walkin' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<FlowPatient | null>(null);
  // Remount the form on every open so a reopened dialog starts clean.
  const [session, setSession] = useState(0);
  const patient = fixedPatient ?? picked;

  const isBook = kind === 'book';
  const Icon = isBook ? CalendarPlus : UserPlus;
  const label = triggerLabel ?? (isBook ? 'Rendez-vous' : "Salle d'attente");
  const title = isBook ? 'Nouveau rendez-vous' : "Mettre en salle d'attente";
  const description = !patient
    ? 'Choisissez le patient.'
    : isBook
      ? 'Choisissez le jour et l’heure.'
      : 'Le patient apparaîtra dans la salle d’attente du médecin.';

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setPicked(null);
      setSession((n) => n + 1);
    }
  }

  const done = useCallback(() => {
    setOpen(false);
    if (successHref) router.push(successHref);
  }, [router, successHref]);

  const close = useCallback(() => setOpen(false), []);
  const changePatient = fixedPatient ? undefined : () => setPicked(null);

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant ?? (isBook ? 'secondary' : 'default')}
        size={triggerSize}
        className={triggerClassName}
        onClick={() => handleOpenChange(true)}
        aria-label={fixedPatient ? `${label} — ${fixedPatient.fullName}` : undefined}
      >
        <Icon aria-hidden />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {!patient ? (
            <DialogBody>
              <PatientPicker
                onSelect={(p) => setPicked(p)}
                newPatientHref={`/patients/new?next=${encodeURIComponent(isBook ? '/today/book' : '/today/walk-in')}`}
              />
            </DialogBody>
          ) : isBook ? (
            <BookAppointmentForm
              key={`${session}-${patient.id}`}
              patient={patient}
              onDone={done}
              onCancel={close}
              onChangePatient={changePatient}
            />
          ) : (
            <WalkInForm
              key={`${session}-${patient.id}`}
              patient={patient}
              onDone={done}
              onCancel={close}
              onChangePatient={changePatient}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** "+ Rendez-vous": patient picker then booking form, in a dialog. */
export function BookAppointmentDialog(props: FlowProps) {
  return <FlowDialog kind="book" {...props} />;
}

/** "+ Salle d'attente": patient picker then walk-in form, in a dialog. */
export function WalkInDialog(props: FlowProps) {
  return <FlowDialog kind="walkin" {...props} />;
}
