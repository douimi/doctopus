'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { acceptAssistantInvite, type AssistantState } from './actions';

const initial: AssistantState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Création…' : 'Rejoindre le cabinet'}
    </Button>
  );
}

export function AssistantInviteForm({ token, emailHint }: { token: string; emailHint: string }) {
  const [state, action] = useActionState(acceptAssistantInvite, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="fullName">Votre nom complet</Label>
        <Input id="fullName" name="fullName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={emailHint} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe (12 caractères min)</Label>
        <Input id="password" name="password" type="password" minLength={12} required />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Submit />
    </form>
  );
}
