'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/**
 * True when the visitor asked the OS to reduce motion. Server snapshot is
 * `false`; mockups then jump straight to their final state on the client.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => (typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(REDUCED_MOTION_QUERY).matches
      : false),
    () => false,
  );
}

/**
 * Reveal-on-scroll hook backed by IntersectionObserver. One-shot: once
 * `revealed` flips true, the observer disconnects and the value never
 * goes back to false. Server-side rendering returns `revealed: false`.
 *
 * On the landing it only *triggers* mockup micro-animations; content is
 * never hidden behind it (no opacity-0 until JS runs).
 */
export function useReveal<T extends HTMLElement>(
  options: { threshold?: number; rootMargin?: string } = {},
): { ref: React.RefObject<T | null>; revealed: boolean } {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (revealed) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      // No observer (very old browser): reveal on the next tick.
      const id = setTimeout(() => setRevealed(true), 0);
      return () => clearTimeout(id);
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
            return;
          }
        }
      },
      {
        threshold: options.threshold ?? 0.2,
        rootMargin: options.rootMargin ?? '0px 0px -10% 0px',
      },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [revealed, options.threshold, options.rootMargin]);

  return { ref, revealed };
}

/**
 * Typewriter hook. Returns the substring of `fullText` typed so far.
 * Starts when `startWhen` flips true (after `startDelayMs`), advances by
 * one character every `charDelayMs`. One-shot: once started, runs to
 * completion regardless of subsequent `startWhen` changes.
 */
export function useTypewriter(
  fullText: string,
  opts: { startWhen: boolean; charDelayMs?: number; startDelayMs?: number },
): string {
  const charDelayMs = opts.charDelayMs ?? 30;
  const startDelayMs = opts.startDelayMs ?? 0;
  const [text, setText] = useState('');
  const startedRef = useRef(false);

  useEffect(() => {
    if (!opts.startWhen || startedRef.current) return;
    startedRef.current = true;

    let i = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const startTimeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        i += 1;
        setText(fullText.slice(0, i));
        if (i >= fullText.length && intervalId !== null) {
          clearInterval(intervalId);
        }
      }, charDelayMs);
    }, startDelayMs);

    return () => {
      clearTimeout(startTimeoutId);
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [opts.startWhen, fullText, charDelayMs, startDelayMs]);

  return text;
}

/**
 * Count-up hook. Animates a numeric value from 0 to `target` over
 * `durationMs`, using ease-out cubic. One-shot. Backed by
 * requestAnimationFrame.
 */
export function useCountUp(
  target: number,
  opts: { startWhen: boolean; durationMs?: number; startDelayMs?: number },
): number {
  const durationMs = opts.durationMs ?? 1200;
  const startDelayMs = opts.startDelayMs ?? 0;
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!opts.startWhen || startedRef.current) return;
    startedRef.current = true;

    let rafId: number | null = null;
    let startTime: number | null = null;
    const startTimeoutId = setTimeout(() => {
      const tick = (now: number) => {
        if (startTime === null) startTime = now;
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = Math.round(target * eased * 100) / 100;
        if (t >= 1) {
          setValue(target);
          rafId = null;
        } else {
          setValue(v);
          rafId = requestAnimationFrame(tick);
        }
      };
      rafId = requestAnimationFrame(tick);
    }, startDelayMs);

    return () => {
      clearTimeout(startTimeoutId);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [opts.startWhen, target, durationMs, startDelayMs]);

  return value;
}

/**
 * True once `window.scrollY` exceeds `threshold` px. Only re-renders when
 * the boolean actually flips (React bails out on identical state).
 */
export function useIsScrolled(threshold = 80): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}
