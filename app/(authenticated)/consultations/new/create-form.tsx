'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CalendarPlus } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createManualConsultationAction,
  type CreateManualConsultationState,
} from './actions';

const initial: CreateManualConsultationState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      <CalendarPlus aria-hidden />
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
    <form action={action} className="space-y-3">
      <input type="hidden" name="patientId" value={patientId} />
      <div className="space-y-1 max-w-xs">
        <Label htmlFor="consultedAt" className="text-small font-medium">
          Date de la consultation
        </Label>
        <Input
          id="consultedAt"
          name="consultedAt"
          type="date"
          defaultValue={defaultDate}
          max={defaultDate}
          required
        />
        <p className="text-small text-muted-foreground">
          Antédatez pour enregistrer une consultation déjà effectuée.
        </p>
      </div>
      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
      <Submit />
    </form>
  );
}
