'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { acknowledgeChatbotDisclaimerAction } from './acknowledge-action';

export function DisclaimerModal({ initiallyAcknowledged }: { initiallyAcknowledged: boolean }) {
  const [open, setOpen] = useState(!initiallyAcknowledged);
  const [, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="space-y-3">
        <DialogTitle>Assistant IA — note importante</DialogTitle>
        <DialogDescription>
          Cet assistant transmet le contexte du patient (anonymisé : ni nom, ni CIN) à un
          fournisseur d&apos;IA. C&apos;est un outil d&apos;aide ; le jugement clinique reste le vôtre.
        </DialogDescription>
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={() =>
              start(async () => {
                await acknowledgeChatbotDisclaimerAction();
                setOpen(false);
              })
            }
          >
            J&apos;ai compris
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
