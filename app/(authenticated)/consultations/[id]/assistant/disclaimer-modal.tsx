'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { acknowledgeChatbotDisclaimerAction } from './acknowledge-action';

/**
 * Shown on the doctor's FIRST send (not on page load), so it never
 * interrupts a consultation that doesn't use the assistant.
 */
export function DisclaimerModal({
  open,
  onCancel,
  onAcknowledged,
}: {
  open: boolean;
  onCancel: () => void;
  onAcknowledged: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Assistant IA — note importante</DialogTitle>
          <DialogDescription>
            Cet assistant transmet le contexte du patient (anonymisé : ni nom, ni CIN) à un
            fournisseur d&apos;IA. C&apos;est un outil d&apos;aide ; le jugement clinique reste le
            vôtre.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
          <Button
            type="button"
            loading={pending}
            onClick={() =>
              start(async () => {
                await acknowledgeChatbotDisclaimerAction();
                onAcknowledged();
              })
            }
          >
            J&apos;ai compris
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
