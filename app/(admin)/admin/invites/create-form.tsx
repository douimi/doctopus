'use client';

import { useActionState, useState } from 'react';
import { Check, Copy, Mail } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { adminCreateInviteAction, type CreateInviteState } from './actions';

const initial: CreateInviteState = { error: null, url: null, expiresAt: null };

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setFailed(false);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setFailed(true);
        }
      }}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? 'Copié' : failed ? 'Copie impossible, sélectionnez le lien' : 'Copier le lien'}
    </Button>
  );
}

function fmtExpiry(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CreateInviteForm() {
  const [state, action] = useActionState(adminCreateInviteAction, initial);
  const fe = state.fieldErrors ?? {};
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvelle invitation médecin</CardTitle>
        <CardDescription>
          Le médecin reçoit un lien pour créer son compte et son cabinet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          action={action}
          className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-start"
        >
          <FormField label="Email" error={fe.email}>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              required
              autoComplete="off"
              placeholder="dr@cabinet.ma"
              defaultValue={state.values?.email ?? ''}
            />
          </FormField>
          <FormField label="Validité (jours)" error={fe.days}>
            <Input
              id="days"
              name="days"
              type="number"
              inputMode="numeric"
              min="1"
              max="30"
              defaultValue={state.values?.days ?? '7'}
            />
          </FormField>
          {/* Aligns with the inputs (label height + gap). */}
          <div className="sm:pt-[1.375rem]">
            <SubmitButton className="w-full sm:w-auto" pendingLabel="Création…">
              <Mail aria-hidden />
              Créer l&apos;invitation
            </SubmitButton>
          </div>
        </form>

        {state.error ? <Alert variant="danger">{state.error}</Alert> : null}

        {state.url ? (
          <Alert variant="success" title="Invitation créée">
            <div className="mt-1 space-y-2">
              <p>
                Envoyez ce lien à{' '}
                <span className="font-medium text-foreground">{state.email}</span>. Il n&apos;est
                affiché qu&apos;une fois.
              </p>
              <code className="block rounded-md border border-border bg-card px-2 py-1.5 text-small break-all text-foreground select-all">
                {state.url}
              </code>
              <div className="flex flex-wrap items-center gap-2">
                <CopyButton value={state.url} />
                {state.expiresAt ? (
                  <span className="text-small text-muted-foreground tabular-nums">
                    Expire le {fmtExpiry(state.expiresAt)}
                  </span>
                ) : null}
              </div>
            </div>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
