'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { bookAction, type BookState } from './actions';

const initial: BookState = { error: null };

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'En cours…' : 'Enregistrer'}
    </Button>
  );
}

export function BookForm({ results }: { results: { id: string; label: string }[] }) {
  const [state, action] = useActionState(bookAction, initial);
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={todayIso()} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="time">Heure</Label>
          <Input id="time" name="time" type="time" required />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="reason">Motif (optionnel)</Label>
        <Textarea id="reason" name="reason" rows={2} />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Submit />
    </form>
  );
}
