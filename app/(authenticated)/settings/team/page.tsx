'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { FormField } from '@/components/ui/form-field';
import { PageHeader } from '@/components/shell/page-header';
import { inviteAssistant, type InviteAssistantState } from './actions';

const initial: InviteAssistantState = { error: null, lastUrl: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Inviter l&apos;assistant(e)
    </Button>
  );
}

export default function TeamSettingsPage() {
  const [state, action] = useActionState(inviteAssistant, initial);
  return (
    <>
      <PageHeader title="Équipe" />
      <div className="px-6 py-6">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Inviter un(e) assistant(e)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={action} className="flex items-end gap-2">
              <FormField label="Email" className="flex-1">
                <Input id="email" name="email" type="email" required />
              </FormField>
              <Submit />
            </form>
            {state.error ? (
              <Alert variant="danger">{state.error}</Alert>
            ) : null}
            {state.lastUrl ? (
              <div className="rounded border border-border p-3 text-sm">
                <p className="font-medium">Lien d&apos;invitation (valide 7 jours)</p>
                <code className="block break-all text-xs mt-1">{state.lastUrl}</code>
                <p className="mt-1 text-muted-foreground">
                  Copiez ce lien et envoyez-le à votre assistant(e).
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
