'use client';

import { useState, useTransition, type FormEvent } from 'react';

type BaseState = { ok: boolean; error: string | null };

/**
 * Runs a `(prev, formData) => state` server action from a form's onSubmit
 * instead of `<form action>`. Unlike `useActionState`, React doesn't reset
 * the form afterwards, so typed values survive a validation error. Use
 * `run()` to call the same action from a confirm dialog.
 */
export function useFormAction<S extends BaseState>(
  action: (prev: S, formData: FormData) => Promise<S>,
  initial: S,
  { onSuccess }: { onSuccess?: (state: S, form: HTMLFormElement | null) => void } = {},
) {
  const [state, setState] = useState<S>(initial);
  const [pending, startTransition] = useTransition();

  async function run(formData: FormData, form: HTMLFormElement | null = null): Promise<S> {
    let next: S;
    try {
      next = await action(state, formData);
    } catch {
      next = { ...state, ok: false, error: 'Action impossible. Réessayez dans un instant.' };
    }
    setState(next);
    if (next.ok) onSuccess?.(next, form);
    return next;
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      await run(formData, form);
    });
  }

  return { state, pending, onSubmit, run };
}
