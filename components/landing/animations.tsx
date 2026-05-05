'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Reveal-on-scroll hook backed by IntersectionObserver. One-shot: once
 * `revealed` flips true, the observer disconnects and the value never
 * goes back to false. Server-side rendering returns `revealed: false`.
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
      setRevealed(true);
      return;
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
 * Tracks document scroll progress 0..1. Updates only when value changes
 * by ≥ 0.5%. Server-side returns 0.
 */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const compute = () => {
      const max =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (max <= 0) return 0;
      return Math.min(1, Math.max(0, window.scrollY / max));
    };
    const onScroll = () => setProgress((p) => {
      const next = compute();
      return Math.abs(next - p) > 0.005 ? next : p;
    });
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return progress;
}

/**
 * True once `window.scrollY` exceeds `threshold` px (hysteresis-free).
 * Use to compactify a sticky header after the user scrolls past the hero.
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

/**
 * Returns a ref + a `style` object for a subtle parallax effect.
 * The element translates vertically based on its distance from the
 * viewport center, scaled by `strength` (positive = element moves
 * upward faster than scroll). Off when prefers-reduced-motion is set.
 */
export function useParallax<T extends HTMLElement>(
  strength = 0.08,
): { ref: React.RefObject<T | null>; style: React.CSSProperties } {
  const ref = useRef<T | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    let raf: number | null = null;
    const compute = () => {
      raf = null;
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const center = window.innerHeight / 2;
      const elementCenter = rect.top + rect.height / 2;
      const delta = elementCenter - center;
      setOffset(-delta * strength);
    };
    const onScroll = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [strength]);

  return {
    ref,
    style: { transform: `translate3d(0, ${offset.toFixed(1)}px, 0)`, willChange: 'transform' },
  };
}

/**
 * Mouse-magnetic hover translation. Returns onMouseMove / onMouseLeave
 * handlers and a transform style. The element translates a fraction of
 * the cursor offset, capped to avoid overshooting. Off under
 * prefers-reduced-motion.
 */
export function useMagnetic(strength = 0.25, max = 12) {
  const [transform, setTransform] = useState<string>('translate3d(0,0,0)');
  const reduceRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    reduceRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (reduceRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) * strength;
      const dy = (e.clientY - (rect.top + rect.height / 2)) * strength;
      const cx = Math.max(-max, Math.min(max, dx));
      const cy = Math.max(-max, Math.min(max, dy));
      setTransform(`translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`);
    },
    [strength, max],
  );

  const onMouseLeave = useCallback(() => {
    setTransform('translate3d(0,0,0)');
  }, []);

  return {
    onMouseMove,
    onMouseLeave,
    style: { transform, transition: 'transform 220ms cubic-bezier(0.16,1,0.3,1)' },
  };
}
