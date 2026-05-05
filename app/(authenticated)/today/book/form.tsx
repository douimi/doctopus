'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
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
    <Button type="submit" loading={pending}>
      Enregistrer
    </Button>
  );
}

export function BookForm({
  results,
}: {
  results: { id: string; name: string; meta: string }[];
}) {
  const [state, action] = useActionState(bookAction, initial);
  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-1.5">
        <legend className="text-small font-medium mb-1.5">
          Sélectionner un patient
        </legend>
        <div className="space-y-1">
          {results.map((r) => (
            <label
              key={r.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card cursor-pointer hover:bg-muted/40 has-[:checked]:bg-primary-tint has-[:checked]:border-primary/30 transition-colors"
              style={{ transitionDuration: 'var(--duration-fast)' }}
            >
              <input
                type="radio"
                name="patientId"
                value={r.id}
                required
                className="size-4 accent-primary"
              />
              <Avatar name={r.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-body font-medium truncate">{r.name}</div>
                <div className="text-small text-muted-foreground truncate">
                  {r.meta}
                </div>
              </div>
            </label>
          ))}
        </div>
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
      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
      <Submit />
    </form>
  );
}
