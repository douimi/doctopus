'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCircle2, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOAST_EVENT = 'doctopus:toast';
const DEFAULT_DURATION_MS = 6000;

export type ToastVariant = 'info' | 'success' | 'warning';

export type ToastInput = {
  /** Optional dedup key — repeated dispatches with the same id replace, not stack. */
  id?: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = Required<Pick<ToastInput, 'id' | 'title' | 'variant'>> &
  Omit<ToastInput, 'id' | 'title' | 'variant'>;

/**
 * Fire a toast from anywhere in the client tree. The <Toaster /> mounted
 * in the shell layout will render it. No-op on the server.
 */
export function showToast(input: ToastInput): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: input }));
}

const variantIcon = {
  info: Bell,
  success: CheckCircle2,
  warning: TriangleAlert,
} as const;

// Neutral popover surface; only the icon carries the tone.
const variantIconClass = {
  info: 'text-primary',
  success: 'text-success',
  warning: 'text-warning-ink',
} as const;

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<ToastInput>).detail;
      if (!detail) return;
      setCounter((n) => n + 1);
      setItems((cur) => {
        const id = detail.id ?? `auto-${counter}`;
        const item: ToastItem = {
          id,
          title: detail.title,
          description: detail.description,
          href: detail.href,
          hrefLabel: detail.hrefLabel,
          variant: detail.variant ?? 'info',
          durationMs: detail.durationMs,
        };
        // Dedup by id — replace existing rather than stack copies.
        const next = cur.filter((t) => t.id !== id);
        next.push(item);
        return next;
      });
      const duration = detail.durationMs ?? DEFAULT_DURATION_MS;
      const id = detail.id ?? `auto-${counter}`;
      setTimeout(() => {
        setItems((cur) => cur.filter((t) => t.id !== id));
      }, duration);
    }
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, [counter]);

  function dismiss(id: string) {
    setItems((cur) => cur.filter((t) => t.id !== id));
  }

  if (items.length === 0) return null;
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 md:bottom-4"
    >
      {items.map((t) => {
        const Icon = variantIcon[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-popover px-3.5 py-3 text-popover-foreground shadow-popover"
            style={{ animation: 'doctopus-toast-in 180ms ease-out' }}
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', variantIconClass[t.variant])} aria-hidden />
            <div className="flex-1 min-w-0">
              <div className="text-body font-medium text-foreground">{t.title}</div>
              {t.description ? (
                <div className="text-small text-muted-foreground mt-0.5">
                  {t.description}
                </div>
              ) : null}
              {t.href ? (
                <Link
                  href={t.href}
                  onClick={() => dismiss(t.id)}
                  className="mt-1 inline-flex items-center text-small font-medium text-primary hover:underline"
                >
                  {t.hrefLabel ?? 'Voir'}
                </Link>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Fermer la notification"
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
