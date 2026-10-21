'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CalendarPlus } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  createManualConsultationAction,
  type CreateManualConsultationState,
} from './actions';

const initial: CreateManualConsultationState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {pending ? null : <CalendarPlus aria-hidden />}
      Créer la consultation
    </Button>
  );
}

export function CreateConsultationForm({
  patientId,
  defaultDate,
}: {
  patientId: string;
  defaultDate: string;
}) {
  const [state, action] = useActionState(createManualConsultationAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="patientId" value={patientId} />
      <FormField
        label="Date de la consultation"
        description="Antédatez pour enregistrer une consultation déjà effectuée."
        className="max-w-xs"
      >
        <Input
          id="consultedAt"
          name="consultedAt"
          type="date"
          defaultValue={defaultDate}
          max={defaultDate}
          required
        />
      </FormField>
      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
      <div className="flex justify-end border-t border-border pt-4">
        <Submit />
      </div>
    </form>
  );
}
