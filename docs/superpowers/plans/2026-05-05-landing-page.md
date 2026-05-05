# Doctopus landing page (storytelling premium) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `app/page.tsx` redirect with a 7-section dark, Apple-style storytelling landing page (Hero → Consultation → Ordonnance → Tarification → Statistiques → Assistant IA → CTA + footer) that reveals features section-by-section on scroll, with cinematic typewriter animations on the consultation editor and AI assistant sections, and a count-up animation on the stats section.

**Architecture:** Server-rendered top-level page composing static + client islands. Three custom hooks (`useReveal`, `useTypewriter`, `useCountUp`) drive all animation, backed by `IntersectionObserver` + `requestAnimationFrame` — no animation library. Each animated section is a `'use client'` component; static sections (Pricing, CTA, Footer) stay server. `tw-animate-css` (already installed) provides reveal classes; tailwind's gradient utilities + `bg-clip-text` provide the accent typography.

**Tech Stack:** Next.js 16 App Router (server + client islands), Tailwind v4, `tw-animate-css` (already in `package.json`), `lucide-react` icons (already used elsewhere), `@testing-library/react` + `happy-dom` (already in `devDependencies`) for the hook unit tests. **No new dependency. No schema change. No API change. No DB query.**

**Spec:** [docs/superpowers/specs/2026-05-05-landing-page-design.md](../specs/2026-05-05-landing-page-design.md) (commit `fcf3e2f`).

---

## File map

**Created (15 files)**

```
components/landing/
  animations.tsx                     # useReveal + useTypewriter + useCountUp ('use client')
  topbar.tsx                         # sticky top nav (server component)
  hero.tsx                           # hero section ('use client' for mount-stagger)
  section-frame.tsx                  # generic reveal-on-scroll wrapper ('use client')
  consultation-section.tsx           # composes section-frame + ConsultationMockup
  consultation-mockup.tsx            # patient card + 2 typewriter fields ('use client')
  ordonnance-section.tsx             # composes section-frame + OrdonnanceMockup
  ordonnance-mockup.tsx              # search input typewriter + dropdown reveal ('use client')
  pricing-section.tsx                # static side-by-side dialog + payments mockup
  stats-section.tsx                  # composes section-frame + StatsMockup
  stats-mockup.tsx                   # 4 KPI tiles + bar chart with count-up ('use client')
  ai-section.tsx                     # composes section-frame + AIMockup
  ai-mockup.tsx                      # chat panel with typewriter response ('use client')
  cta-section.tsx                    # final CTA + 2 buttons (server)
  landing-footer.tsx                 # copyright + links (server)

tests/unit/landing/
  animations.test.tsx                # useTypewriter + useCountUp with fake timers
```

**Modified**

```
app/page.tsx                         # was 5-line redirect; becomes landing composition
```

**Untouched**

- `app/(authenticated)/**`, `app/(public)/**`, `app/(admin)/**`, `app/api/**` — every other route.
- `components/ui/**`, `components/payments/**`, `components/today/**`, `components/shell/**` — primitives untouched.
- `lib/**`, `db/**`, `supabase/migrations/**`, `package.json` — no business logic, schema, or dep change.

---

## Task 1 — Animation hooks with TDD

**Files:**
- Create: `components/landing/animations.tsx`
- Test: `tests/unit/landing/animations.test.tsx`

`useReveal` is excluded from unit tests because mocking `IntersectionObserver` adds noise without value (it's a thin wrapper around a browser API). Visual verification at the end. The two state-machine hooks (`useTypewriter`, `useCountUp`) get full coverage.

- [ ] **Step 1: Write the failing test at `tests/unit/landing/animations.test.tsx`**

```tsx
// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypewriter, useCountUp } from '@/components/landing/animations';

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string when startWhen is false', () => {
    const { result } = renderHook(() =>
      useTypewriter('Hello world', { startWhen: false }),
    );
    expect(result.current).toBe('');
  });

  it('types character-by-character once startWhen flips true', async () => {
    const { result, rerender } = renderHook(
      ({ start }: { start: boolean }) =>
        useTypewriter('Hello', { startWhen: start, charDelayMs: 30 }),
      { initialProps: { start: false } },
    );
    expect(result.current).toBe('');

    rerender({ start: true });
    // Before any timer ticks, the first character is scheduled, not yet rendered.
    expect(result.current).toBe('');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30);
    });
    expect(result.current).toBe('H');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 4);
    });
    expect(result.current).toBe('Hello');

    // Timer should have stopped after the full string.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 10);
    });
    expect(result.current).toBe('Hello');
  });

  it('respects startDelayMs before the first character', async () => {
    const { result, rerender } = renderHook(
      ({ start }: { start: boolean }) =>
        useTypewriter('AB', { startWhen: start, charDelayMs: 30, startDelayMs: 200 }),
      { initialProps: { start: false } },
    );
    rerender({ start: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(result.current).toBe('');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(80); // 230ms total — past delay + first char (30)
    });
    expect(result.current).toBe('A');
  });

  it('one-shot: does not reset if startWhen flickers false then true again', async () => {
    const { result, rerender } = renderHook(
      ({ start }: { start: boolean }) =>
        useTypewriter('Hi', { startWhen: start, charDelayMs: 30 }),
      { initialProps: { start: false } },
    );
    rerender({ start: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });
    expect(result.current).toBe('Hi');

    rerender({ start: false });
    expect(result.current).toBe('Hi'); // stays full
  });
});

describe('useCountUp', () => {
  let rafCalls: Array<{ cb: FrameRequestCallback; id: number }>;
  let lastId: number;
  let nowValue: number;

  beforeEach(() => {
    rafCalls = [];
    lastId = 0;
    nowValue = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => nowValue);
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      lastId += 1;
      rafCalls.push({ cb, id: lastId });
      return lastId;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
      const idx = rafCalls.findIndex((c) => c.id === id);
      if (idx >= 0) rafCalls.splice(idx, 1);
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function advance(ms: number) {
    nowValue += ms;
    const calls = rafCalls.splice(0, rafCalls.length);
    for (const c of calls) c.cb(nowValue);
  }

  it('returns 0 when startWhen is false', () => {
    const { result } = renderHook(() => useCountUp(100, { startWhen: false }));
    expect(result.current).toBe(0);
  });

  it('animates from 0 to target over durationMs (ease-out)', () => {
    const { result, rerender } = renderHook(
      ({ start }: { start: boolean }) =>
        useCountUp(100, { startWhen: start, durationMs: 1000 }),
      { initialProps: { start: false } },
    );
    expect(result.current).toBe(0);

    act(() => {
      rerender({ start: true });
    });
    expect(result.current).toBe(0); // first frame schedules but does not advance

    // Advance to mid-point: ease-out cubic at t=0.5 → 1 - (0.5)^3 = 0.875
    act(() => {
      advance(500);
    });
    expect(result.current).toBeGreaterThan(80); // ease-out is past 0.5 of the way
    expect(result.current).toBeLessThan(95);

    // Advance past full duration: should land exactly on target.
    act(() => {
      advance(600);
    });
    expect(result.current).toBe(100);
  });

  it('one-shot: does not reset if startWhen flickers false', () => {
    const { result, rerender } = renderHook(
      ({ start }: { start: boolean }) =>
        useCountUp(50, { startWhen: start, durationMs: 100 }),
      { initialProps: { start: false } },
    );
    act(() => {
      rerender({ start: true });
    });
    act(() => {
      advance(150); // past full duration
    });
    expect(result.current).toBe(50);

    act(() => {
      rerender({ start: false });
    });
    expect(result.current).toBe(50); // stays at target
  });
});
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm test tests/unit/landing/animations.test.tsx
```

Expected: FAIL with `Cannot find module '@/components/landing/animations'`.

- [ ] **Step 3: Implement `components/landing/animations.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

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
```

- [ ] **Step 4: Run tests, expect pass**

```bash
pnpm test tests/unit/landing/animations.test.tsx
```

Expected: 7 tests pass (3 for useTypewriter + 3 for useCountUp + the implicit "returns 0" cases).

If any test fails because of `act()` ordering issues with happy-dom, the test code uses `act` from `@testing-library/react` which is the correct wrapper. If the runner reports `useTypewriter` doesn't import — verify the path `@/components/landing/animations`.

- [ ] **Step 5: Run full suite**

```bash
pnpm test
```

Expected: 190 baseline + 6 new = ≥ 196 tests pass.

- [ ] **Step 6: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 7: Commit — STAGE ONLY THESE TWO FILES**

```bash
git add components/landing/animations.tsx tests/unit/landing/animations.test.tsx
git status --porcelain | grep -E "^[MA]" | grep -v -E "components/landing/animations\.tsx$|tests/unit/landing/animations\.test\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(landing): animation hooks (useReveal, useTypewriter, useCountUp)

Three hand-rolled client-side hooks that drive the landing page
animations. useReveal wraps IntersectionObserver (one-shot reveal on
scroll-into-view). useTypewriter advances a substring char-by-char on
a setInterval. useCountUp animates a numeric value via
requestAnimationFrame with ease-out cubic.

All three are one-shot (do not reset if their trigger flickers off).
useTypewriter and useCountUp covered by unit tests with vitest fake
timers + happy-dom.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — Foundations: topbar + section-frame + hero

**Files:**
- Create: `components/landing/topbar.tsx`
- Create: `components/landing/section-frame.tsx`
- Create: `components/landing/hero.tsx`

These three components are the structural foundation. The 5 feature sections (Tasks 3–7) and the CTA (Task 8) all depend on `<SectionFrame>`. The `<Topbar>` is independent and used only at the top.

- [ ] **Step 1: Create `components/landing/topbar.tsx`**

```tsx
import Link from 'next/link';
import { BrandLockup } from '@/components/ui/brand';

const MAILTO = 'mailto:douimiotmane@gmail.com?subject=Doctopus%20%E2%80%94%20demande%20d%27acc%C3%A8s';

export function Topbar() {
  return (
    <div className="sticky top-0 z-50 bg-black/85 backdrop-blur-md border-b border-white/5">
      <div className="max-w-[1200px] mx-auto px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-white">
          <BrandLockup size={28} />
          <span>Doctopus</span>
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={MAILTO}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white border border-white/20 hover:bg-white/5 transition-colors"
          >
            Demander un accès
          </a>
          <Link
            href="/sign-in"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/landing/section-frame.tsx`**

```tsx
'use client';

import type { ReactNode } from 'react';
import { useReveal } from './animations';
import { cn } from '@/lib/utils';

/**
 * Generic full-screen section with reveal-on-scroll. Children are
 * rendered inside a container that fades + slides up when the section
 * crosses 20% into the viewport. The reveal flag is also passed to a
 * render-prop so child mockups can trigger their own typewriter / count-up
 * animations.
 */
export function SectionFrame({
  children,
  className,
}: {
  children: ((revealed: boolean) => ReactNode) | ReactNode;
  className?: string;
}) {
  const { ref, revealed } = useReveal<HTMLElement>();
  const content = typeof children === 'function' ? children(revealed) : children;
  return (
    <section
      ref={ref}
      className={cn(
        'min-h-screen px-8 py-32 flex flex-col items-center justify-center max-w-[1200px] mx-auto',
        className,
      )}
    >
      <div
        className={cn(
          'w-full flex flex-col items-center transition-all duration-700 ease-out',
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        )}
      >
        {content}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create `components/landing/hero.tsx`**

```tsx
'use client';

import Link from 'next/link';

const MAILTO = 'mailto:douimiotmane@gmail.com?subject=Doctopus%20%E2%80%94%20demande%20d%27acc%C3%A8s';

export function Hero() {
  return (
    <section
      className="min-h-screen px-8 py-32 flex flex-col items-center justify-center text-center relative"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 30% 20%, rgba(56,189,248,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(129,140,248,0.10) 0%, transparent 50%)',
      }}
    >
      <div className="text-sky-400 text-[13px] uppercase tracking-[0.1em] font-semibold mb-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
        Logiciel de cabinet médical · Maroc
      </div>
      <h1 className="text-6xl md:text-8xl font-semibold tracking-tight leading-none max-w-4xl animate-in fade-in-0 slide-in-from-bottom-4 duration-700 [animation-delay:100ms] [animation-fill-mode:both]">
        Le cabinet,{' '}
        <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
          repensé.
        </span>
      </h1>
      <p className="text-xl text-white/70 max-w-xl mt-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 [animation-delay:200ms] [animation-fill-mode:both]">
        Doctopus rassemble consultations, ordonnances, paiements et statistiques dans une interface conçue pour les médecins du Maroc.
      </p>
      <div className="flex gap-3 mt-10 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 [animation-delay:300ms] [animation-fill-mode:both]">
        <Link
          href="/sign-in"
          className="px-7 py-3.5 rounded-lg text-base font-medium bg-white text-black hover:bg-white/90 transition-colors"
        >
          Se connecter
        </Link>
        <a
          href={MAILTO}
          className="px-7 py-3.5 rounded-lg text-base font-medium text-white border border-white/20 hover:bg-white/5 transition-colors"
        >
          Demander un accès
        </a>
      </div>
      <div className="absolute bottom-8 text-white/30 text-sm animate-bounce [animation-duration:2s] [animation-delay:600ms] [animation-fill-mode:both]">
        ↓ découvrir
      </div>
    </section>
  );
}
```

The `[animation-fill-mode:both]` arbitrary on every staggered element is critical — without it the elements flash visible at frame 0 before the animation runs, defeating the staggered fade-up.

- [ ] **Step 4: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 5: Run tests (regression check)**

```bash
pnpm test
```

Expected: 196/196 still pass.

- [ ] **Step 6: Commit — STAGE ONLY THESE THREE FILES**

```bash
git add components/landing/topbar.tsx components/landing/section-frame.tsx components/landing/hero.tsx
git status --porcelain | grep -E "^[MA]" | grep -v -E "landing/(topbar|section-frame|hero)\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(landing): topbar + section-frame + hero foundations

Topbar: sticky black/85 with backdrop-blur, BrandLockup + 2 CTAs
(Demander un accès as mailto, Se connecter to /sign-in).

SectionFrame: reusable full-screen container with reveal-on-scroll.
Children can be a render-prop receiving the revealed flag, so child
mockups can sync their cinematic animations to the section reveal.

Hero: full-screen with radial-gradient mesh background, staggered
mount fade-up via tw-animate-css + arbitrary animation-delay/fill-mode
utilities. Headline 'Le cabinet, repensé.' with the second word in
sky→indigo gradient via bg-clip-text.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — Consultation section (cinematic)

**Files:**
- Create: `components/landing/consultation-section.tsx`
- Create: `components/landing/consultation-mockup.tsx`

The mockup uses `useTypewriter` for the Motif and Diagnostic fields, triggered by the `revealed` flag from the section's `<SectionFrame>` render-prop.

- [ ] **Step 1: Create `components/landing/consultation-mockup.tsx`**

```tsx
'use client';

import { useTypewriter } from './animations';

const MOTIF = 'Toux persistante depuis 5 jours';
const DIAGNOSTIC = 'Bronchite aiguë, probable origine virale';

export function ConsultationMockup({ revealed }: { revealed: boolean }) {
  const motifText = useTypewriter(MOTIF, { startWhen: revealed, charDelayMs: 30 });
  const diagnosticText = useTypewriter(DIAGNOSTIC, {
    startWhen: revealed,
    charDelayMs: 30,
    startDelayMs: MOTIF.length * 30 + 400, // start after Motif finishes + 400ms pause
  });
  const motifDone = motifText.length === MOTIF.length;
  const diagnosticDone = diagnosticText.length === DIAGNOSTIC.length;

  return (
    <div className="mt-16 max-w-[900px] w-full bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-2xl p-2 shadow-2xl">
      <div className="flex gap-1.5 px-3.5 py-2.5">
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
      </div>
      <div className="bg-[#f5f5f5] text-slate-900 rounded-xl p-6 min-h-[320px]">
        {/* Patient card */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-full bg-sky-500 text-white flex items-center justify-center font-semibold">
            BY
          </div>
          <div className="flex-1">
            <div className="font-semibold">Berrada Yasmine</div>
            <div className="text-sm text-slate-500">F · 34 ans · CIN BK123456</div>
          </div>
          <div
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              motifDone
                ? 'bg-green-100 text-green-800 animate-pulse [animation-iteration-count:1] [animation-duration:1s]'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {motifDone ? '● Enregistré' : '● Brouillon'}
          </div>
        </div>
        {/* Motif field */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 mb-2">
          <div className="text-[11px] uppercase text-slate-400 tracking-wide mb-1 font-medium">
            Motif
          </div>
          <div className="text-sm">
            {motifText}
            {!motifDone && revealed ? <span className="opacity-60">|</span> : null}
          </div>
        </div>
        {/* Diagnostic field */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <div className="text-[11px] uppercase text-slate-400 tracking-wide mb-1 font-medium">
            Diagnostic
          </div>
          <div className="text-sm">
            {diagnosticText}
            {!diagnosticDone && motifDone ? <span className="opacity-60">|</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/landing/consultation-section.tsx`**

```tsx
import { SectionFrame } from './section-frame';
import { ConsultationMockup } from './consultation-mockup';

export function ConsultationSection() {
  return (
    <SectionFrame>
      {(revealed) => (
        <>
          <div className="text-sky-400 text-[13px] uppercase tracking-[0.1em] font-semibold mb-4">
            01 — Consultation
          </div>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
            Une consultation complète.{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              Sans paperasse.
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
            Motif, antécédents, examen, diagnostic, suivi, ordonnance — tout dans une seule fenêtre. L&apos;autosave veille pour vous.
          </p>
          <ConsultationMockup revealed={revealed} />
        </>
      )}
    </SectionFrame>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: 196/196 still pass.

- [ ] **Step 5: Commit — STAGE ONLY THESE TWO FILES**

```bash
git add components/landing/consultation-section.tsx components/landing/consultation-mockup.tsx
git status --porcelain | grep -E "^[MA]" | grep -v -E "landing/consultation-(section|mockup)\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(landing): consultation section with cinematic typewriter

Section 01 of the landing page. Patient card + 2 fields (Motif,
Diagnostic) in a Mac-titlebar-styled mockup. When the section enters
the viewport, Motif types in over ~4.5s, then Diagnostic types after
a 400ms pause. The 'Brouillon' badge swaps to '● Enregistré' with a
green pulse when typing finishes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — Ordonnance section (cinematic)

**Files:**
- Create: `components/landing/ordonnance-section.tsx`
- Create: `components/landing/ordonnance-mockup.tsx`

- [ ] **Step 1: Create `components/landing/ordonnance-mockup.tsx`**

```tsx
'use client';

import { useTypewriter } from './animations';

type Med = {
  name: string;
  dci: string;
  lab: string;
  ppv: string;
  highlighted?: boolean;
};

const MEDS: Med[] = [
  { name: 'Doliprane 1000mg · comprimé', dci: 'Paracétamol', lab: 'Sanofi', ppv: '12,50 MAD', highlighted: true },
  { name: 'Doliprane 500mg · comprimé', dci: 'Paracétamol', lab: 'Sanofi', ppv: '8,20 MAD' },
  { name: 'DOLICOX 120 mg · comprimé pelliculé', dci: 'Diclofénac', lab: 'BOTTU', ppv: '81,70 MAD' },
  { name: 'Doliprane Codéine', dci: 'Paracétamol/Codéine', lab: 'Sanofi', ppv: '18,40 MAD' },
];

export function OrdonnanceMockup({ revealed }: { revealed: boolean }) {
  const queryText = useTypewriter('doli', { startWhen: revealed, charDelayMs: 80 });
  const queryDone = queryText === 'doli';

  return (
    <div className="mt-16 max-w-[900px] w-full bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-2xl p-2 shadow-2xl">
      <div className="flex gap-1.5 px-3.5 py-2.5">
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
      </div>
      <div className="bg-[#f5f5f5] text-slate-900 rounded-xl p-6 min-h-[320px]">
        <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-3 mb-2 text-sm">
          {queryText || <span className="text-slate-400">Rechercher un médicament…</span>}
          {!queryDone && revealed ? <span className="opacity-60">|</span> : null}
        </div>
        {queryDone ? (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300">
            {MEDS.map((m, idx) => (
              <div
                key={m.name}
                className={`px-3.5 py-2.5 flex items-baseline gap-3 text-sm ${
                  m.highlighted
                    ? 'bg-sky-50 animate-pulse [animation-iteration-count:1] [animation-duration:600ms] [animation-delay:300ms] [animation-fill-mode:both]'
                    : ''
                } ${idx < MEDS.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-slate-500 text-xs"> — {m.dci} ({m.lab})</span>
                </div>
                <div className="text-slate-500 tabular-nums shrink-0">{m.ppv}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/landing/ordonnance-section.tsx`**

```tsx
import { SectionFrame } from './section-frame';
import { OrdonnanceMockup } from './ordonnance-mockup';

export function OrdonnanceSection() {
  return (
    <SectionFrame>
      {(revealed) => (
        <>
          <div className="text-sky-400 text-[13px] uppercase tracking-[0.1em] font-semibold mb-4">
            02 — Ordonnance intelligente
          </div>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
            3000+ médicaments du registre AMMPS.{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              Avec leur prix.
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
            Recherche en temps réel dans le registre officiel marocain. Le PPV s&apos;affiche directement, l&apos;autocomplétion mémorise vos posologies habituelles.
          </p>
          <OrdonnanceMockup revealed={revealed} />
        </>
      )}
    </SectionFrame>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: 196/196.

- [ ] **Step 5: Commit**

```bash
git add components/landing/ordonnance-section.tsx components/landing/ordonnance-mockup.tsx
git status --porcelain | grep -E "^[MA]" | grep -v -E "landing/ordonnance-(section|mockup)\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(landing): ordonnance section with cinematic search reveal

Section 02. Search input types 'doli' at ~80ms/char, then a dropdown
with 4 real-looking AMMPS medications drops down with the first row
pulsing once. PPV displayed right-aligned, tabular-nums.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — Pricing section (static)

**Files:**
- Create: `components/landing/pricing-section.tsx`

This section has no animation beyond the section-frame reveal — both mockup cards are fully static. Single file.

- [ ] **Step 1: Create `components/landing/pricing-section.tsx`**

```tsx
import { SectionFrame } from './section-frame';

export function PricingSection() {
  return (
    <SectionFrame>
      <div className="text-sky-400 text-[13px] uppercase tracking-[0.1em] font-semibold mb-4">
        03 — Tarification & paiements
      </div>
      <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
        Du diagnostic au paiement.{' '}
        <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
          Sans friction.
        </span>
      </h2>
      <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
        Le médecin clôture, l&apos;assistant encaisse — chacun voit ce qu&apos;il doit voir. Espèces, carte, chèque, virement.
      </p>

      <div className="mt-16 max-w-[900px] w-full bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-2xl p-2 shadow-2xl">
        <div className="flex gap-1.5 px-3.5 py-2.5">
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
        </div>
        <div className="bg-[#f5f5f5] text-slate-900 rounded-xl p-6 grid grid-cols-2 gap-5">
          {/* LEFT — Médecin */}
          <div>
            <div className="text-sm font-semibold text-slate-600 mb-3">Médecin · Clôture</div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="font-semibold text-base mb-4">Tarification et clôture</div>
              <div className="text-[11px] uppercase text-slate-400 tracking-wide mb-1.5 font-medium">
                Prix (MAD)
              </div>
              <div className="w-full px-3 py-3 border border-slate-200 rounded-lg text-lg font-medium tabular-nums">
                250
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm text-slate-600">
                <span className="text-slate-400">☐</span> Gratuit
              </div>
              <div className="w-full mt-4 px-4 py-3 bg-slate-900 text-white rounded-lg text-sm font-medium text-center">
                Terminer la consultation
              </div>
            </div>
          </div>
          {/* RIGHT — Assistant */}
          <div>
            <div className="text-sm font-semibold text-slate-600 mb-3">Assistant · Paiements</div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-3 py-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                  BY
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">Berrada Yasmine</div>
                  <div className="text-xs text-slate-400">il y a 2 min</div>
                </div>
                <div className="font-semibold tabular-nums text-sm shrink-0">250,00 MAD</div>
                <div className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium">
                  Encaisser
                </div>
              </div>
              <div className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-pink-500 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                  AA
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">Alami Ali</div>
                  <div className="text-xs text-slate-400">hier 18:30</div>
                </div>
                <div className="font-semibold tabular-nums text-sm shrink-0">300,00 MAD</div>
                <div className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium">
                  Encaisser
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
```

Note: this section is server-rendered. `<SectionFrame>` is `'use client'` but server components can compose client components — Next.js handles the boundary.

- [ ] **Step 2: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: 196/196.

- [ ] **Step 4: Commit**

```bash
git add components/landing/pricing-section.tsx
git status --porcelain | grep -E "^[MA]" | grep -v "landing/pricing-section\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(landing): pricing section (static side-by-side)

Section 03. Two-column mockup: doctor's finalize dialog (price input
+ Gratuit checkbox + dark CTA) on the left, assistant's PaymentsPanel
with two waiting rows on the right. Static — animation comes from the
section-frame reveal only.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — Stats section (count-up)

**Files:**
- Create: `components/landing/stats-section.tsx`
- Create: `components/landing/stats-mockup.tsx`

- [ ] **Step 1: Create `components/landing/stats-mockup.tsx`**

```tsx
'use client';

import { useCountUp } from './animations';

const fmtMad = (v: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) +
  ' MAD';
const fmtInt = (v: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v));

const BAR_HEIGHTS = [30, 55, 45, 80, 65, 90, 70];

export function StatsMockup({ revealed }: { revealed: boolean }) {
  const recettes = useCountUp(42350, { startWhen: revealed, durationMs: 1200, startDelayMs: 0 });
  const consultations = useCountUp(142, { startWhen: revealed, durationMs: 1200, startDelayMs: 120 });
  const prixMoyen = useCountUp(309.12, { startWhen: revealed, durationMs: 1200, startDelayMs: 240 });
  const enAttente = useCountUp(5, { startWhen: revealed, durationMs: 1200, startDelayMs: 360 });

  return (
    <div className="mt-16 max-w-[900px] w-full bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-2xl p-2 shadow-2xl">
      <div className="flex gap-1.5 px-3.5 py-2.5">
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
      </div>
      <div className="bg-[#f5f5f5] text-slate-900 rounded-xl p-6">
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Tile tone="success" label="Recettes" value={fmtMad(recettes)} hint="137 consultations" />
          <Tile tone="primary" label="Consultations" value={fmtInt(consultations)} hint="137 payés · 5 en attente" />
          <Tile tone="admin" label="Prix moyen" value={fmtMad(prixMoyen)} hint="MAD/consultation" />
          <Tile tone="warning" label="En attente" value={fmtInt(enAttente)} hint="1 250,00 MAD à encaisser" />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 h-36 flex items-end gap-2">
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-sky-500 to-sky-400 rounded-t-md transition-all duration-700 ease-out"
              style={{
                height: revealed ? `${h}%` : '0%',
                transitionDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Tile({
  tone,
  label,
  value,
  hint,
}: {
  tone: 'success' | 'primary' | 'admin' | 'warning';
  label: string;
  value: string;
  hint: string;
}) {
  const toneClasses: Record<typeof tone, { wrap: string; icon: string }> = {
    success: { wrap: 'bg-green-100', icon: 'text-green-700' },
    primary: { wrap: 'bg-blue-100', icon: 'text-blue-700' },
    admin: { wrap: 'bg-orange-100', icon: 'text-orange-700' },
    warning: { wrap: 'bg-amber-100', icon: 'text-amber-700' },
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${toneClasses[tone].wrap}`}>
        <span className={`text-base ${toneClasses[tone].icon}`}>●</span>
      </div>
      <div className="text-[11px] uppercase text-slate-400 tracking-wide font-medium">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/landing/stats-section.tsx`**

```tsx
import { SectionFrame } from './section-frame';
import { StatsMockup } from './stats-mockup';

export function StatsSection() {
  return (
    <SectionFrame>
      {(revealed) => (
        <>
          <div className="text-sky-400 text-[13px] uppercase tracking-[0.1em] font-semibold mb-4">
            04 — Statistiques
          </div>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
            Votre cabinet,{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              en chiffres.
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
            Recettes du jour, du mois, de l&apos;année. Méthodes de paiement, paiements en attente, top patients. Tout ce qu&apos;il faut pour piloter.
          </p>
          <StatsMockup revealed={revealed} />
        </>
      )}
    </SectionFrame>
  );
}
```

- [ ] **Step 3: Type-check + run tests**

```bash
pnpm exec tsc --noEmit && pnpm test
```

Expected: clean tsc + 196/196.

- [ ] **Step 4: Commit**

```bash
git add components/landing/stats-section.tsx components/landing/stats-mockup.tsx
git status --porcelain | grep -E "^[MA]" | grep -v -E "landing/stats-(section|mockup)\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(landing): stats section with count-up

Section 04. 4 KPI tiles (Recettes / Consultations / Prix moyen / En
attente) animate from 0 to their target values via useCountUp,
staggered ~120ms apart. Below: a 7-bar bar chart whose bars grow from
0 to their target heights via CSS transition with stagger.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — AI section (cinematic)

**Files:**
- Create: `components/landing/ai-section.tsx`
- Create: `components/landing/ai-mockup.tsx`

- [ ] **Step 1: Create `components/landing/ai-mockup.tsx`**

```tsx
'use client';

import { useTypewriter } from './animations';

const USER_QUESTION = 'Quelles sont les contre-indications de l\'ibuprofène pour cette patiente?';
const BOT_RESPONSE = `Compte tenu du contexte clinique (toux persistante, pas d'antécédents notables), l'ibuprofène est en principe utilisable. Cependant, surveillez :

• allergie aux AINS (non documentée chez cette patiente — à confirmer)
• troubles digestifs récents
• prise concomitante d'anticoagulants

Le paracétamol reste le choix de première intention pour cette indication virale.`;

const USER_REVEAL_DELAY = 0;
const THINKING_DELAY = 400;
const BOT_TYPE_DELAY = THINKING_DELAY + 800;

export function AIMockup({ revealed }: { revealed: boolean }) {
  const botText = useTypewriter(BOT_RESPONSE, {
    startWhen: revealed,
    charDelayMs: 25,
    startDelayMs: BOT_TYPE_DELAY,
  });
  const showThinking = revealed && botText.length === 0;
  const botDone = botText.length === BOT_RESPONSE.length;

  return (
    <div className="mt-16 max-w-xl w-full bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-2xl p-2 shadow-2xl">
      <div className="flex gap-1.5 px-3.5 py-2.5">
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
      </div>
      <div className="bg-[#f5f5f5] text-slate-900 rounded-xl p-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="font-semibold text-sm mb-3.5 flex items-center gap-2">
            🤖 Assistant clinique
          </div>
          {revealed ? (
            <div className="bg-slate-100 rounded-xl px-3.5 py-2.5 mb-2 ml-auto max-w-[90%] text-sm leading-relaxed animate-in fade-in-0 slide-in-from-right-2 duration-300">
              {USER_QUESTION}
            </div>
          ) : null}
          {showThinking ? (
            <div className="bg-sky-50 text-sky-900 rounded-xl px-3.5 py-2.5 max-w-[90%] inline-flex gap-1 animate-in fade-in-0 duration-200">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:300ms]" />
            </div>
          ) : null}
          {botText.length > 0 ? (
            <div className="bg-sky-50 text-sky-900 rounded-xl px-3.5 py-2.5 max-w-[90%] text-sm leading-relaxed whitespace-pre-line">
              {botText}
              {!botDone ? <span className="opacity-60">|</span> : null}
            </div>
          ) : null}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 mt-3 text-sm text-slate-400">
            Posez une question…
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/landing/ai-section.tsx`**

```tsx
import { SectionFrame } from './section-frame';
import { AIMockup } from './ai-mockup';

export function AISection() {
  return (
    <SectionFrame>
      {(revealed) => (
        <>
          <div className="text-sky-400 text-[13px] uppercase tracking-[0.1em] font-semibold mb-4">
            05 — Assistant clinique IA
          </div>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
            Un coup de main,{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              quand vous en avez besoin.
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
            Posez une question — l&apos;assistant connaît le motif, les allergies, les antécédents du patient. Sans jamais transmettre son identité.
          </p>
          <AIMockup revealed={revealed} />
          <p className="text-sm text-white/50 mt-6 text-center">
            Anthropic · OpenAI · Mistral, au choix. Données patient anonymisées avant transmission.
          </p>
        </>
      )}
    </SectionFrame>
  );
}
```

- [ ] **Step 3: Type-check + run tests**

```bash
pnpm exec tsc --noEmit && pnpm test
```

Expected: clean tsc + 196/196.

- [ ] **Step 4: Commit**

```bash
git add components/landing/ai-section.tsx components/landing/ai-mockup.tsx
git status --porcelain | grep -E "^[MA]" | grep -v -E "landing/ai-(section|mockup)\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(landing): AI section with cinematic chat reveal

Section 05. Chat panel mockup. On reveal: user question bubble fades in
from right, then a 400ms pause + 800ms thinking-dots indicator, then
the bot response types out at ~25ms/char (~330 chars, ~8s) with the
multi-paragraph response respecting newlines via whitespace-pre-line.
Footnote: 'Anthropic · OpenAI · Mistral, au choix.'

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 — CTA + footer + page wiring + verify + push

**Files:**
- Create: `components/landing/cta-section.tsx`
- Create: `components/landing/landing-footer.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create `components/landing/cta-section.tsx`**

```tsx
import Link from 'next/link';

const MAILTO = 'mailto:douimiotmane@gmail.com?subject=Doctopus%20%E2%80%94%20demande%20d%27acc%C3%A8s';

export function CTASection() {
  return (
    <section
      className="px-8 py-32 flex flex-col items-center justify-center text-center relative min-h-[70vh]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at center, rgba(129,140,248,0.15) 0%, transparent 60%)',
      }}
    >
      <h2 className="text-5xl md:text-7xl font-semibold tracking-tight leading-tight max-w-3xl">
        Prêt à essayer{' '}
        <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
          Doctopus
        </span>
        ?
      </h2>
      <p className="text-xl text-white/70 max-w-xl mt-6">
        Sur invitation uniquement pendant la phase pilote. Contactez-nous pour évaluer si Doctopus convient à votre cabinet.
      </p>
      <div className="flex gap-3 mt-10">
        <Link
          href="/sign-in"
          className="px-7 py-3.5 rounded-lg text-base font-medium bg-white text-black hover:bg-white/90 transition-colors"
        >
          Se connecter
        </Link>
        <a
          href={MAILTO}
          className="px-7 py-3.5 rounded-lg text-base font-medium text-white border border-white/20 hover:bg-white/5 transition-colors"
        >
          Demander un accès
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `components/landing/landing-footer.tsx`**

```tsx
import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="px-8 py-8 border-t border-white/5 text-center text-sm text-white/40">
      © 2026 Doctopus ·{' '}
      <Link href="/static/sous-traitants" className="text-white/60 hover:text-white/80 transition-colors">
        Sous-traitants
      </Link>{' '}
      ·{' '}
      <a href="mailto:douimiotmane@gmail.com" className="text-white/60 hover:text-white/80 transition-colors">
        douimiotmane@gmail.com
      </a>
    </footer>
  );
}
```

- [ ] **Step 3: Replace `app/page.tsx`**

The current file is 5 lines (`redirect('/today')`). Replace with the composition:

```tsx
import type { Metadata } from 'next';
import { Topbar } from '@/components/landing/topbar';
import { Hero } from '@/components/landing/hero';
import { ConsultationSection } from '@/components/landing/consultation-section';
import { OrdonnanceSection } from '@/components/landing/ordonnance-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { StatsSection } from '@/components/landing/stats-section';
import { AISection } from '@/components/landing/ai-section';
import { CTASection } from '@/components/landing/cta-section';
import { LandingFooter } from '@/components/landing/landing-footer';

export const metadata: Metadata = {
  title: 'Doctopus — Logiciel de cabinet médical pour le Maroc',
  description:
    'Consultations, ordonnances, paiements et statistiques dans une seule interface conçue pour les médecins du Maroc. Sur invitation pendant la phase pilote.',
};

export default function HomePage() {
  return (
    <div className="bg-black text-white selection:bg-sky-500/30">
      <Topbar />
      <Hero />
      <ConsultationSection />
      <OrdonnanceSection />
      <PricingSection />
      <StatsSection />
      <AISection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 5: Run full test suite**

```bash
pnpm test
```

Expected: 196/196.

- [ ] **Step 6: Manual smoke (dev server already running on port 3000)**

Open http://localhost:3000 in a browser. Expected:
- Black page, sticky topbar with logo + 2 CTAs.
- Hero animates in (eyebrow → headline → lead → CTAs → scroll hint).
- Scroll into Consultation section → reveal animation + Motif typewriter + Diagnostic typewriter + green pulse.
- Scroll into Ordonnance → search types `doli` → dropdown drops down → first row pulses.
- Scroll into Pricing → static reveal of the 2-card mockup.
- Scroll into Stats → 4 KPIs count up + bars grow.
- Scroll into AI → user question fades in → thinking dots → bot response types out.
- Scroll into CTA → final pitch.
- Footer at bottom.
- Click "Se connecter" → routes to `/sign-in`.
- Click "Demander un accès" → opens mailto.

If dev server isn't running:

```bash
pnpm dev
```

If you can't smoke-test (no browser available), proceed anyway — the unit tests + tsc are the launch gate.

- [ ] **Step 7: Commit**

```bash
git add components/landing/cta-section.tsx components/landing/landing-footer.tsx app/page.tsx
git status --porcelain | grep -E "^[MA]" | grep -v -E "landing/(cta-section|landing-footer)\.tsx$|app/page\.tsx$"
```

If extras, STOP. Otherwise:

```bash
git commit -m "feat(landing): CTA + footer + page wiring (replaces / redirect)

The home route was a 5-line redirect to /today; it now composes the
full storytelling landing page (Topbar + Hero + 5 feature sections +
CTA + Footer). Page metadata sets the French title and description
for SEO.

Side effect: logged-in users hitting / now see the landing page
instead of being routed to /today (acceptable per spec). They click
'Se connecter' to reach /sign-in which forwards them to /today.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 8: Verify final commit log**

```bash
git log fcf3e2f..HEAD --oneline
```

Expected: 8 implementation commits in order:

```
feat(landing): CTA + footer + page wiring (replaces / redirect)
feat(landing): AI section with cinematic chat reveal
feat(landing): stats section with count-up
feat(landing): pricing section (static side-by-side)
feat(landing): ordonnance section with cinematic search reveal
feat(landing): consultation section with cinematic typewriter
feat(landing): topbar + section-frame + hero foundations
feat(landing): animation hooks (useReveal, useTypewriter, useCountUp)
```

- [ ] **Step 9: Spec acceptance check**

| # | Criterion | Verified by |
|---|---|---|
| 1 | `/` shows landing (no redirect) | Step 3 of this task replaced redirect |
| 2 | Logged-in user also sees landing | Same — no auth check in `app/page.tsx` |
| 3 | All 7 sections + topbar + footer in order | Step 3 composition |
| 4 | Hero stagger fade-up on mount | Hero animate-in classes (Task 2) |
| 5 | Each feature section fades + slides up on viewport entry | SectionFrame's transition (Task 2) |
| 6 | Consultation Motif + Diagnostic typewriter on reveal | ConsultationMockup (Task 3) |
| 7 | Ordonnance search types `doli`, dropdown reveals, first row pulses | OrdonnanceMockup (Task 4) |
| 8 | Stats 4 KPIs count up; bars grow | StatsMockup (Task 6) |
| 9 | AI user question + thinking dots + bot typewriter | AIMockup (Task 7) |
| 10 | All "Se connecter" buttons → `/sign-in` | Topbar, Hero, CTASection (Tasks 2, 8) |
| 11 | All "Demander un accès" → mailto | Topbar, Hero, CTASection — same MAILTO constant |
| 12 | Footer "Sous-traitants" → `/static/sous-traitants` | LandingFooter (Task 8) |
| 13 | tsc clean; existing tests still pass | Step 4-5 of this task |
| 14 | No new dependency, no schema change | `git diff main..HEAD -- package.json supabase/migrations db/schema` empty |

If any criterion fails, STOP and report.

- [ ] **Step 10: Push to origin**

Per the saved auto-push memory:

```bash
git push origin main
```

Expected: clean fast-forward; 8 commits delivered.

- [ ] **Step 11: Working tree confirmation**

```bash
git status
```

Expected: `On branch main`, `Your branch is up to date with 'origin/main'`, working tree clean (the `.superpowers/` directory from the brainstorming session is gitignored, so it shouldn't appear).
