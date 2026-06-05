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

const variantClass = {
  info: 'border-primary/30 bg-primary-tint text-foreground',
  success: 'border-success/30 bg-success-tint text-foreground',
  warning: 'border-warning/30 bg-warning-tint text-foreground',
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
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-[calc(100vw-2rem)]"
    >
      {items.map((t) => {
        const Icon = variantIcon[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto rounded-xl border shadow-card px-3 py-2.5 flex items-start gap-3',
              variantClass[t.variant],
            )}
            style={{ animation: 'doctopus-toast-in 180ms ease-out' }}
          >
            <Icon className="size-4 mt-0.5 shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-body leading-tight">{t.title}</div>
              {t.description ? (
                <div className="text-small text-muted-foreground mt-0.5">
                  {t.description}
                </div>
              ) : null}
              {t.href ? (
                <Link
                  href={t.href}
                  onClick={() => dismiss(t.id)}
                  className="inline-flex items-center text-small font-medium text-foreground hover:underline mt-1"
                >
                  {t.hrefLabel ?? 'Voir'}
                </Link>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Fermer la notification"
              className="text-muted-foreground hover:text-foreground transition-colors size-5 inline-flex items-center justify-center rounded shrink-0"
              style={{ transitionDuration: 'var(--duration-fast)' }}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
