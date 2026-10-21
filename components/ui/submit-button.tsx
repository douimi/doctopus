'use client';

import type { ComponentProps } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, 'type' | 'loading'> & {
  /** Text shown while the enclosing form action is pending (labelled buttons only). */
  pendingLabel?: string;
};

/**
 * Submit button for `<form action={…}>`. Reads the enclosing form's
 * pending state via `useFormStatus`, shows a spinner and disables itself
 * so a double tap can't fire the action twice. Must be rendered inside
 * the `<form>`.
 */
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  size,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const iconOnly = typeof size === 'string' && size.startsWith('icon');
  return (
    <Button
      type="submit"
      size={size}
      loading={pending}
      disabled={disabled}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? (iconOnly ? null : (pendingLabel ?? children)) : children}
    </Button>
  );
}
