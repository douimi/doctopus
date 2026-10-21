'use client';

import { useState, useTransition, type ReactElement, type ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export type ConfirmResult = { ok: true } | { ok: false; error?: string } | void;

export type ConfirmDialogProps = {
  /** Element that opens the dialog (rendered via base-ui `render`). Omit when controlled. */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Extra content between the description and the footer. */
  children?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  /** `danger` uses the solid destructive button (ui-spec §4.14). */
  tone?: 'danger' | 'default';
  /**
   * Runs on confirm. Return `{ ok: false, error }` to keep the dialog open
   * and show the error; anything else closes it. Thrown errors are shown
   * with a generic message.
   */
  onConfirm: () => Promise<ConfirmResult> | ConfirmResult;
};

/**
 * Confirmation modal for destructive or irreversible actions (cancel an
 * appointment, mark absent, archive a patient…). The confirm button shows
 * a pending state and the dialog can't be dismissed while it runs.
 */
export function ConfirmDialog({
  trigger,
  open: openProp,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  pendingLabel,
  cancelLabel = 'Annuler',
  tone = 'danger',
  onConfirm,
}: ConfirmDialogProps) {
  const [openState, setOpenState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;

  function setOpen(next: boolean) {
    if (pending && !next) return;
    if (next) setError(null);
    if (!controlled) setOpenState(next);
    onOpenChange?.(next);
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await onConfirm();
        if (res && res.ok === false) {
          setError(res.error ?? 'Action impossible. Réessayez.');
          return;
        }
        if (!controlled) setOpenState(false);
        onOpenChange?.(false);
      } catch {
        setError('Action impossible. Réessayez.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent size="sm" role="alertdialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children || error ? (
          <DialogBody>
            {children}
            {error ? <Alert variant="danger">{error}</Alert> : null}
          </DialogBody>
        ) : null}
        <DialogFooter>
          <DialogClose
            render={<Button variant="secondary" disabled={pending} />}
          >
            {cancelLabel}
          </DialogClose>
          <Button
            type="button"
            variant={tone === 'danger' ? 'destructive-solid' : 'default'}
            loading={pending}
            onClick={confirm}
          >
            {pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
