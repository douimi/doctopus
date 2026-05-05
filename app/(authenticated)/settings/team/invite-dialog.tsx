'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, Copy, Mail, UserPlus } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { inviteAssistant, type InviteAssistantState } from './actions';

const initial: InviteAssistantState = { error: null, lastUrl: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      <UserPlus aria-hidden />
      Créer le lien
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
      {copied ? 'Copié' : 'Copier le lien'}
    </Button>
  );
}

export function InviteDialog() {
  const [state, action] = useActionState(inviteAssistant, initial);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <UserPlus aria-hidden />
        Inviter un(e) assistant(e)
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="flex items-center justify-center size-10 rounded-lg bg-primary-tint text-primary shrink-0"
            >
              <Mail className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <DialogTitle>Inviter un(e) assistant(e)</DialogTitle>
              <DialogDescription>
                Créez un lien d&apos;invitation valide 7 jours.
              </DialogDescription>
            </div>
          </div>

          <form action={action} className="space-y-3">
            <FormField label="Email">
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="assistante@cabinet.ma"
              />
            </FormField>
            {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
            {state.lastUrl ? (
              <Alert variant="success" title="Lien créé — valide 7 jours">
                <div className="space-y-2 mt-2">
                  <code className="block break-all text-small bg-card border border-border rounded-md px-2 py-1.5 text-foreground tabular-nums">
                    {state.lastUrl}
                  </code>
                  <CopyButton value={state.lastUrl} />
                </div>
              </Alert>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Fermer
              </Button>
              <Submit />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
