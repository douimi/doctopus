'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, Copy, UserPlus } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { inviteAssistant, type InviteAssistantState } from './actions';

const initial: InviteAssistantState = { error: null, lastUrl: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      <UserPlus aria-hidden />
      Inviter
    </Button>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* noop */
        }
      }}
      aria-label="Copier le lien"
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? 'Copié' : 'Copier'}
    </Button>
  );
}

export function InviteForm() {
  const [state, action] = useActionState(inviteAssistant, initial);
  return (
    <div className="space-y-4">
      <form action={action} className="flex items-end gap-2">
        <FormField label="Email" className="flex-1">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="assistante@cabinet.ma"
          />
        </FormField>
        <Submit />
      </form>
      {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
      {state.lastUrl ? (
        <Alert variant="success" title="Lien d'invitation créé (valide 7 jours)">
          <div className="space-y-2 mt-2">
            <code className="block break-all text-small bg-card border border-border rounded-md px-2 py-1.5 text-foreground tabular-nums">
              {state.lastUrl}
            </code>
            <div className="flex items-center gap-2 flex-wrap">
              <CopyButton value={state.lastUrl} />
              <span className="text-small text-muted-foreground">
                Envoyez ce lien à votre assistant(e).
              </span>
            </div>
          </div>
        </Alert>
      ) : null}
    </div>
  );
}
