'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { inviteAssistant, type InviteAssistantState } from './actions';

const initial: InviteAssistantState = { error: null, lastUrl: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Création…' : "Inviter l'assistant(e)"}
    </Button>
  );
}

export default function TeamSettingsPage() {
  const [state, action] = useActionState(inviteAssistant, initial);
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Inviter un(e) assistant(e)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="flex items-end gap-2">
          <div className="space-y-2 flex-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <Submit />
        </form>
        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state.lastUrl ? (
          <div className="rounded border p-3 text-sm">
            <p className="font-medium">Lien d&apos;invitation (valide 7 jours)</p>
            <code className="block break-all text-xs mt-1">{state.lastUrl}</code>
            <p className="mt-1 text-gray-600">
              Copiez ce lien et envoyez-le à votre assistant(e).
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
