'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DialogBody, DialogFooter } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { showToast } from '@/components/ui/toast';
import { walkInAction } from '@/app/(authenticated)/today/walk-in/actions';
import type { WalkInState } from '@/app/(authenticated)/today/book/types';
import { FollowUpParentField } from './follow-up-parent-field';
import { PageBodyPart, PageFooterPart } from './book-appointment-form';
import { SelectedPatient, type FlowPatient } from './selected-patient';

const initial: WalkInState = { error: null };

/**
 * "Mettre en salle d'attente" for a chosen patient: optional motif and an
 * optional "C'est un suivi" parent. Shared by the walk-in dialog (over
 * /today and the patient file) and the /today/walk-in fallback pages.
 */
export function WalkInForm({
  patient,
  layout = 'dialog',
  defaultFollowUp = false,
  onDone,
  onCancel,
  onChangePatient,
}: {
  patient: FlowPatient;
  layout?: 'dialog' | 'page';
  defaultFollowUp?: boolean;
  onDone?: () => void;
  onCancel?: () => void;
  onChangePatient?: () => void;
}) {
  const uid = useId();
  const [state, formAction] = useActionState(walkInAction, initial);
  const [reason, setReason] = useState('');
  const [followUpBlocking, setFollowUpBlocking] = useState(false);
  const handled = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!state.ok || state.at === handled.current) return;
    handled.current = state.at;
    showToast({
      id: `walkin-${state.at}`,
      variant: 'success',
      title: "Patient en salle d'attente",
      description: state.patientName ?? patient.fullName,
    });
    onDone?.();
  }, [state, onDone, patient.fullName]);

  const Body = layout === 'dialog' ? DialogBody : PageBodyPart;
  const Footer = layout === 'dialog' ? DialogFooter : PageFooterPart;

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="patientId" value={patient.id} />
      <Body>
        <SelectedPatient patient={patient} onChange={onChangePatient} />
        <FormField label="Motif" optional hint="Le médecin pourra le compléter pendant la consultation.">
          <Input
            id={`${uid}-reason`}
            name="reason"
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="ex. fièvre, douleur abdominale…"
            autoComplete="off"
          />
        </FormField>
        <FollowUpParentField
          patientId={patient.id}
          defaultChecked={defaultFollowUp}
          onBlockingChange={setFollowUpBlocking}
        />
        {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
      </Body>
      <Footer>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        ) : null}
        <SubmitButton disabled={followUpBlocking} pendingLabel="Ajout…">
          <UserPlus aria-hidden />
          Mettre en salle d&apos;attente
        </SubmitButton>
      </Footer>
    </form>
  );
}
