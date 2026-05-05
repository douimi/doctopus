'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, Copy, Mail } from 'lucide-react';
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
    <Button type="submit" loading={pending}>
      <Mail aria-hidden />
      Créer
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

export function CreateInviteForm() {
  const [state, action] = useActionState(adminCreateInviteAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer une invitation médecin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form action={action} className="flex flex-wrap items-end gap-2">
          <FormField label="Email" className="flex-1 min-w-[240px]">
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="dr@cabinet.ma"
            />
          </FormField>
          <FormField label="Validité (jours)" className="w-32">
            <Input id="days" name="days" type="number" min="1" max="30" defaultValue="7" />
          </FormField>
          <Submit />
        </form>
        {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
        {state.url ? (
          <Alert variant="success" title="Invitation créée">
            <div className="space-y-2 mt-2">
              <code className="block break-all text-small bg-card border border-border rounded-md px-2 py-1.5 text-foreground">
                {state.url}
              </code>
              <div className="flex items-center gap-2 flex-wrap">
                <CopyButton value={state.url} />
                <span className="text-small text-muted-foreground tabular-nums">
                  Expire le {new Date(state.expiresAt!).toLocaleString('fr-FR')}
                </span>
              </div>
            </div>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
