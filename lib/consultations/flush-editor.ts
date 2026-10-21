'use client';

import { useEffect, useEffectEvent } from 'react';

/**
 * "Save what you've got" bus between the consultation page's editors
 * (clinical sections + vitals, prescription) and higher-level actions
 * such as the finalize dialog.
 *
 * Every mounted editor for the consultation registers a participant.
 * `flushConsultationEditor` dispatches one synchronous event; each
 * participant hands back a promise through `waitUntil`, and the caller
 * waits for ALL of them — no timeout, so a slow save can never be
 * overtaken by the finalize call. A participant can also refuse
 * (`ok: false`) to block the action with a message, e.g. a medication
 * picked in the prescription editor but never added.
 *
 * Resolves `{ ok: true }` immediately when nothing is mounted.
 */

export const FLUSH_EVENT = 'doctopus:flush-consultation-editor';

export type FlushSummary = {
  /** Current diagnosis text (after the flush). */
  diagnosis?: string;
  /** Number of saved prescription lines. */
  rxCount?: number;
  prescriptionId?: string | null;
};

export type FlushResult = { ok: boolean; error?: string; summary?: FlushSummary };

type FlushRequest = {
  consultationId: string;
  waitUntil: (p: Promise<FlushResult>) => void;
};

export async function flushConsultationEditor(consultationId: string): Promise<FlushResult> {
  const pending: Promise<FlushResult>[] = [];
  window.dispatchEvent(
    new CustomEvent<FlushRequest>(FLUSH_EVENT, {
      detail: { consultationId, waitUntil: (p) => pending.push(p) },
    }),
  );
  if (pending.length === 0) return { ok: true };
  const results = await Promise.all(
    pending.map((p) =>
      p.catch(
        (): FlushResult => ({ ok: false, error: 'Erreur de sauvegarde. Réessayez.' }),
      ),
    ),
  );
  const summary: FlushSummary = {};
  for (const r of results) Object.assign(summary, r.summary);
  const failed = results.find((r) => !r.ok);
  return failed ? { ok: false, error: failed.error, summary } : { ok: true, summary };
}

/** Registers `handler` as a flush participant for this consultation. */
export function useConsultationFlush(
  consultationId: string,
  handler: () => Promise<FlushResult>,
): void {
  const onFlush = useEffectEvent((req: FlushRequest) => {
    req.waitUntil(handler());
  });
  useEffect(() => {
    function listener(e: Event) {
      const detail = (e as CustomEvent<FlushRequest>).detail;
      if (!detail || detail.consultationId !== consultationId) return;
      onFlush(detail);
    }
    window.addEventListener(FLUSH_EVENT, listener);
    return () => window.removeEventListener(FLUSH_EVENT, listener);
  }, [consultationId]);
}
