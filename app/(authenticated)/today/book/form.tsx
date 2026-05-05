'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CalendarPlus, Check } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { bookAction, type BookState } from './actions';

const initial: BookState = { error: null };

export type BookPatient = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  phone: string | null;
  cin: string | null;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={disabled} className="w-full">
      <CalendarPlus aria-hidden />
      Enregistrer
    </Button>
  );
}

export function BookForm({ results }: { results: BookPatient[] }) {
  const [state, action] = useActionState(bookAction, initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = results.find((r) => r.id === selectedId) ?? null;

  return (
    <form
      action={action}
      className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start"
    >
      <fieldset>
        <legend className="sr-only">Sélectionner un patient</legend>
        <ul
          role="list"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2"
        >
          {results.map((r) => {
            const isSelected = r.id === selectedId;
            const fullName = `${r.lastName} ${r.firstName}`;
            return (
              <li key={r.id}>
                <label
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-card shadow-card cursor-pointer transition-all card-hover-lift',
                    isSelected
                      ? 'border-primary/40 bg-primary-tint ring-2 ring-primary/30'
                      : 'border-border hover:border-primary/30',
                  )}
                  style={{ transitionDuration: 'var(--duration-fast)' }}
                >
                  <input
                    type="radio"
                    name="patientId"
                    value={r.id}
                    required
                    checked={isSelected}
                    onChange={() => setSelectedId(r.id)}
                    className="sr-only"
                  />
                  <Avatar
                    name={fullName}
                    size="md"
                    tone={isSelected ? 'primary' : 'muted'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-body font-medium truncate">{fullName}</div>
                    <div className="text-small text-muted-foreground truncate tabular-nums">
                      {r.age} ans
                      {r.phone ? ` · ${r.phone}` : ''}
                      {r.cin ? ` · ${r.cin}` : ''}
                    </div>
                  </div>
                  {isSelected ? (
                    <span
                      aria-hidden
                      className="flex items-center justify-center size-5 rounded-pill bg-primary text-primary-foreground shrink-0"
                    >
                      <Check className="size-3" aria-hidden />
                    </span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <aside className="lg:sticky lg:top-4 lg:self-start space-y-3 min-w-0">
        <Card>
          <CardContent className="space-y-4">
            <div>
              <div className="text-small text-muted-foreground uppercase tracking-wide font-medium mb-2">
                Patient sélectionné
              </div>
              {selected ? (
                <div className="flex items-center gap-3">
                  <Avatar
                    name={`${selected.lastName} ${selected.firstName}`}
                    size="lg"
                    tone="primary"
                  />
                  <div className="min-w-0">
                    <div className="text-body font-semibold truncate">
                      {selected.lastName} {selected.firstName}
                    </div>
                    <div className="text-small text-muted-foreground tabular-nums">
                      {selected.age} ans
                      {selected.phone ? ` · ${selected.phone}` : ''}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-small text-muted-foreground italic">
                  Choisissez un patient dans la liste pour planifier un rendez-vous.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={todayIso()}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="time">Heure</Label>
                <Input id="time" name="time" type="time" required />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="reason">Motif (optionnel)</Label>
              <Textarea
                id="reason"
                name="reason"
                rows={3}
                placeholder="ex. suivi, contrôle…"
              />
            </div>

            {state.error ? <Alert variant="danger">{state.error}</Alert> : null}

            <Submit disabled={selected === null} />
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
