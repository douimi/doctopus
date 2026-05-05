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
    expect(result.current).toBe('');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30);
    });
    expect(result.current).toBe('H');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 4);
    });
    expect(result.current).toBe('Hello');

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
      await vi.advanceTimersByTimeAsync(80);
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
    expect(result.current).toBe('Hi');
  });
});

describe('useCountUp', () => {
  let rafCalls: Array<{ cb: FrameRequestCallback; id: number }>;
  let lastId: number;
  let nowValue: number;

  beforeEach(() => {
    vi.useFakeTimers();
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
    vi.useRealTimers();
  });

  /**
   * Fire all pending setTimeouts (the startDelay), then drain the rAF queue
   * at the current nowValue. Each rAF tick may schedule another rAF (until
   * t >= 1, at which point the hook stops). With nowValue past durationMs,
   * the first rAF tick lands at t >= 1 and the queue terminates.
   */
  /**
   * Fire the startDelay setTimeout, which schedules the first rAF, then
   * fire that rAF at the CURRENT nowValue (which becomes startTime inside
   * the hook). Call this once after `rerender({ start: true })`, BEFORE
   * advancing time.
   */
  function startAnimation() {
    vi.runOnlyPendingTimers();
    if (rafCalls.length > 0) {
      const calls = rafCalls.splice(0, rafCalls.length);
      for (const c of calls) c.cb(nowValue);
    }
  }

  /**
   * Advance nowValue to targetMs and drain the rAF queue. Each rAF tick
   * may schedule another rAF; the queue terminates once the hook reaches
   * t >= 1.
   */
  function advanceAndFlush(targetMs: number) {
    nowValue = targetMs;
    let safety = 1000;
    while (rafCalls.length > 0 && safety-- > 0) {
      const calls = rafCalls.splice(0, rafCalls.length);
      for (const c of calls) c.cb(nowValue);
    }
  }

  it('returns 0 when startWhen is false', () => {
    const { result } = renderHook(() => useCountUp(100, { startWhen: false }));
    expect(result.current).toBe(0);
  });

  it('animates from 0 to target by the end of durationMs', () => {
    const { result, rerender } = renderHook(
      ({ start }: { start: boolean }) =>
        useCountUp(100, { startWhen: start, durationMs: 1000 }),
      { initialProps: { start: false } },
    );
    expect(result.current).toBe(0);

    act(() => {
      rerender({ start: true });
    });
    act(() => {
      startAnimation();
    });
    // After the first rAF, startTime has been set to nowValue (0), value still 0.
    expect(result.current).toBe(0);

    // Advance past the full duration; the next rAF lands at t=1 and terminates.
    act(() => {
      advanceAndFlush(1500);
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
      startAnimation();
    });
    act(() => {
      advanceAndFlush(200);
    });
    expect(result.current).toBe(50);

    act(() => {
      rerender({ start: false });
    });
    expect(result.current).toBe(50);
  });
});
