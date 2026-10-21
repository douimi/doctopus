'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { acceptAssistantInvite, type AssistantState } from './actions';

const initial: AssistantState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" loading={pending} className="w-full">
      {pending ? 'Création du compte…' : 'Rejoindre le cabinet'}
    </Button>
  );
}

export function AssistantInviteForm({ token, emailHint }: { token: string; emailHint: string }) {
  const [state, action] = useActionState(acceptAssistantInvite, initial);
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
      <FormField label="Votre nom complet" error={fe.fullName}>
        <Input
          id="fullName"
          name="fullName"
          required
          autoComplete="name"
          defaultValue={v.fullName ?? ''}
        />
      </FormField>
      <FormField label="Email" error={fe.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          defaultValue={v.email ?? emailHint}
        />
      </FormField>
      <FormField label="Mot de passe" hint="12 caractères minimum." error={fe.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </FormField>
      <div className="pt-1">
        <Submit />
      </div>
    </form>
  );
}
