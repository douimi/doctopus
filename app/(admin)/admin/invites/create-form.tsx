'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminCreateInviteAction, type CreateInviteState } from './actions';

const initial: CreateInviteState = { error: null, url: null, expiresAt: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? '…' : 'Créer'}
    </Button>
  );
}

export function CreateInviteForm() {
  const [state, action] = useActionState(adminCreateInviteAction, initial);
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="font-medium text-sm">Créer une invitation médecin</div>
      <form action={action} className="flex items-end gap-2">
        <div className="space-y-1 flex-1">
          <Label htmlFor="email" className="text-xs">
            Email
          </Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1 w-24">
          <Label htmlFor="days" className="text-xs">
            Validité (j)
          </Label>
          <Input id="days" name="days" type="number" min="1" max="30" defaultValue="7" />
        </div>
        <Submit />
      </form>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.url ? (
        <div className="rounded border bg-green-50 p-2 text-xs">
          <p className="font-medium">Invitation créée. Copiez le lien :</p>
          <code className="block break-all mt-1">{state.url}</code>
          <p className="text-gray-600 mt-1">
            Expire le {new Date(state.expiresAt!).toLocaleString('fr-FR')}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
