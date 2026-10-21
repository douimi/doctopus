'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCockpit } from './cockpit-context';

/** Escape closes, focus moves into the sheet on open and back on close. */
function useSheetBehaviour(
  open: boolean,
  close: () => void,
  ref: React.RefObject<HTMLElement | null>,
  /** Only behave like a modal sheet below this width. */
  modalQuery: string,
) {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open) return;
    if (!window.matchMedia(modalQuery).matches) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeRef.current();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, ref, modalQuery]);
}

/**
 * The patient context rail ("Dossier"): ONE instance that is a sticky
 * left column from lg up and a left sheet below lg (opened from the
 * header's antécédents summary). Rendering it once avoids the old
 * duplicated antécédents panel with diverging edit state.
 */
export function ContextRail({ children }: { children: ReactNode }) {
  const { contextOpen, setContextOpen } = useCockpit();
  const ref = useRef<HTMLElement>(null);
  useSheetBehaviour(contextOpen, () => setContextOpen(false), ref, '(max-width: 1023.98px)');

  return (
    <>
      {contextOpen ? (
        <div
          aria-hidden
          onClick={() => setContextOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}
      <aside
        id="patient-context-rail"
        ref={ref}
        tabIndex={-1}
        aria-label="Dossier patient"
        data-open={contextOpen ? 'true' : 'false'}
        className={cn(
          // < lg: off-canvas sheet
          'fixed inset-y-0 left-0 z-50 w-[min(92vw,24rem)] overflow-y-auto overscroll-contain bg-canvas shadow-dialog outline-none',
          'transition-[transform,visibility] duration-200 max-lg:-translate-x-full max-lg:invisible',
          'max-lg:data-[open=true]:translate-x-0 max-lg:data-[open=true]:visible',
          // ≥ lg: sticky column under the header, own scroll
          'lg:sticky lg:top-[var(--cockpit-header-h,7rem)] lg:z-auto lg:h-[calc(100dvh-var(--cockpit-header-h,7rem))] lg:w-auto lg:self-start lg:bg-transparent lg:shadow-none',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5 lg:hidden">
          <span className="text-heading font-semibold">Dossier patient</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fermer le dossier"
            onClick={() => setContextOpen(false)}
          >
            <X aria-hidden />
          </Button>
        </div>
        <div className="space-y-3 p-4 lg:pb-12 lg:pl-8 lg:pr-0">{children}</div>
      </aside>
    </>
  );
}

/**
 * AI assistant drawer. Stays mounted while closed (display:none) so the
 * conversation survives toggling. A third column at xl, a right
 * slide-over below.
 */
export function AssistantDrawer({ children }: { children: ReactNode }) {
  const { aiOpen, setAiOpen, aiAvailable } = useCockpit();
  const ref = useRef<HTMLElement>(null);
  useSheetBehaviour(aiOpen, () => setAiOpen(false), ref, '(max-width: 1279.98px)');
  if (!aiAvailable) return null;

  return (
    <>
      {aiOpen ? (
        <div
          aria-hidden
          onClick={() => setAiOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] xl:hidden"
        />
      ) : null}
      <aside
        ref={ref}
        tabIndex={-1}
        aria-label="Assistant IA"
        className={cn(
          'outline-none',
          aiOpen
            ? 'fixed inset-y-0 right-0 z-50 flex w-[min(92vw,26rem)] flex-col bg-canvas p-3 shadow-dialog xl:sticky xl:top-[var(--cockpit-header-h,7rem)] xl:z-auto xl:h-[calc(100dvh-var(--cockpit-header-h,7rem))] xl:w-[360px] xl:self-start xl:bg-transparent xl:py-4 xl:pl-0 xl:pr-8 xl:shadow-none'
            : 'hidden',
        )}
      >
        <div className="min-h-0 flex-1">{children}</div>
      </aside>
    </>
  );
}
