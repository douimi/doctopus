'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { walkInAction, type WalkInState } from './actions';

const initial: WalkInState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'En cours…' : "Mettre en salle d'attente"}
    </Button>
  );
}

export function WalkInForm({ results }: { results: { id: string; label: string }[] }) {
  const [state, action] = useActionState(walkInAction, initial);
  return (
    <form action={action} className="space-y-3">
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Sélectionner un patient</legend>
        {results.map((r) => (
          <label key={r.id} className="flex items-center gap-2 text-sm">
            <input type="radio" name="patientId" value={r.id} required />
            {r.label}
          </label>
        ))}
      </fieldset>
      <div className="space-y-1">
        <Label htmlFor="reason">Motif (optionnel)</Label>
        <Textarea id="reason" name="reason" rows={2} />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Submit />
    </form>
  );
}
