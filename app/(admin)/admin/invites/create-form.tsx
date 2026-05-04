'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { adminCreateInviteAction, type CreateInviteState } from './actions';

const initial: CreateInviteState = { error: null, url: null, expiresAt: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Créer
    </Button>
  );
}

export function CreateInviteForm() {
  const [state, action] = useActionState(adminCreateInviteAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer une invitation médecin</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex items-end gap-2">
          <FormField label="Email" className="flex-1">
            <Input id="email" name="email" type="email" required />
          </FormField>
          <FormField label="Validité (j)" className="w-24">
            <Input id="days" name="days" type="number" min="1" max="30" defaultValue="7" />
          </FormField>
          <Submit />
        </form>
        {state.error ? <Alert variant="danger" className="mt-2">{state.error}</Alert> : null}
        {state.url ? (
          <Alert variant="success" className="mt-2">
            <p className="font-medium">Invitation créée. Copiez le lien :</p>
            <code className="block break-all mt-1">{state.url}</code>
            <p className="mt-1">
              Expire le {new Date(state.expiresAt!).toLocaleString('fr-FR')}.
            </p>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
