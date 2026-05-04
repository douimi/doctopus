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
    <Button type="submit" loading={pending} className="w-full">
      Rejoindre le cabinet
    </Button>
  );
}

export function AssistantInviteForm({ token, emailHint }: { token: string; emailHint: string }) {
  const [state, action] = useActionState(acceptAssistantInvite, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
      <FormField label="Votre nom complet">
        <Input id="fullName" name="fullName" required />
      </FormField>
      <FormField label="Email">
        <Input id="email" name="email" type="email" defaultValue={emailHint} required />
      </FormField>
      <FormField label="Mot de passe (12 caractères min)">
        <Input id="password" name="password" type="password" minLength={12} required />
      </FormField>
      <Submit />
    </form>
  );
}
