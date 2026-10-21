'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { showToast } from '@/components/ui/toast';

export type AdminActionResult = { ok: true } | { ok: false; error: string };

/**
 * Button that opens a confirmation dialog, then calls an admin server
 * action with the given fields. Success closes the dialog and shows a
 * toast; an `{ ok: false }` result keeps the dialog open with the error.
 */
export function ConfirmActionButton({
  action,
  fields,
  title,
  description,
  details,
  confirmLabel,
  pendingLabel,
  successToast,
  tone = 'danger',
  children,
  ...buttonProps
}: Omit<ComponentProps<typeof Button>, 'type' | 'onClick' | 'children' | 'title'> & {
  action: (formData: FormData) => Promise<AdminActionResult>;
  fields: Record<string, string>;
  title: ReactNode;
  description?: ReactNode;
  /** Extra content inside the dialog body. */
  details?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  successToast?: string;
  tone?: 'danger' | 'default';
  children: ReactNode;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" {...buttonProps}>
          {children}
        </Button>
      }
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      pendingLabel={pendingLabel}
      tone={tone}
      onConfirm={async () => {
        const fd = new FormData();
        for (const [k, v] of Object.entries(fields)) fd.set(k, v);
        const res = await action(fd);
        if (res.ok && successToast) showToast({ title: successToast, variant: 'success' });
        return res;
      }}
    >
      {details}
    </ConfirmDialog>
  );
}
