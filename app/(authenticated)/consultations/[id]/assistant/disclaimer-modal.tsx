'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { acknowledgeChatbotDisclaimerAction } from './acknowledge-action';

export function DisclaimerModal({ initiallyAcknowledged }: { initiallyAcknowledged: boolean }) {
  const [open, setOpen] = useState(!initiallyAcknowledged);
  const [, start] = useTransition();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-w-md rounded-lg bg-white p-5 shadow-xl space-y-3">
        <h2 className="text-lg font-semibold">Assistant IA — note importante</h2>
        <p className="text-sm">
          Cet assistant transmet le contexte du patient (anonymisé : ni nom, ni CIN) à un fournisseur d&apos;IA.
          C&apos;est un outil d&apos;aide ; le jugement clinique reste le vôtre.
        </p>
        <div className="flex justify-end">
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
      </div>
    </div>
  );
}
