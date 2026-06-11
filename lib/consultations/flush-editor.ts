'use client';

/**
 * Asks the currently-mounted ConsultationEditor (if any) to persist its
 * dirty state before a higher-level action proceeds. Used by the
 * finalize dialog so clicking "Terminer la consultation" never throws
 * away unsaved edits.
 *
 * Resolves `{ ok: true }` immediately if no editor is mounted (or it
 * has nothing to flush), so callers don't have to special-case that.
 */
export function flushConsultationEditor(
  consultationId: string,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    let resolved = false;
    const settle = (r: { ok: boolean; error?: string }) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      resolve(r);
    };
    // Fallback: if no editor is listening (different page, race, etc.)
    // we want the calling flow to keep going rather than hang.
    const timeout = setTimeout(() => settle({ ok: true }), 400);
    window.dispatchEvent(
      new CustomEvent('doctopus:flush-consultation-editor', {
        detail: { consultationId, resolve: settle },
      }),
    );
  });
}
