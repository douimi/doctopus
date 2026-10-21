'use client';

import { useSyncExternalStore } from 'react';

const TOKEN_NAMES = [
  '--primary',
  '--primary-tint',
  '--admin',
  '--admin-tint',
  '--success',
  '--success-tint',
  '--warning',
  '--warning-tint',
  '--danger',
  '--danger-tint',
  '--info',
  '--muted',
  '--muted-foreground',
  '--border',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
] as const;

export type ChartToken = (typeof TOKEN_NAMES)[number];
export type ChartTokens = Record<ChartToken, string>;

const FALLBACK: ChartTokens = {
  '--primary': '#0ea5e9',
  '--primary-tint': '#e0f2fe',
  '--admin': '#ea580c',
  '--admin-tint': '#fed7aa',
  '--success': '#16a34a',
  '--success-tint': '#dcfce7',
  '--warning': '#f59e0b',
  '--warning-tint': '#fef3c7',
  '--danger': '#dc2626',
  '--danger-tint': '#fee2e2',
  '--info': '#0ea5e9',
  '--muted': '#f4f4f5',
  '--muted-foreground': '#71717a',
  '--border': '#e4e4e7',
  '--chart-1': '#0284c7',
  '--chart-2': '#059669',
  '--chart-3': '#f59e0b',
  '--chart-4': '#6366f1',
  '--chart-5': '#f43f5e',
};

function readTokens(): ChartTokens {
  if (typeof window === 'undefined' || typeof document === 'undefined') return FALLBACK;
  const styles = window.getComputedStyle(document.documentElement);
  const out = {} as ChartTokens;
  for (const name of TOKEN_NAMES) {
    const v = styles.getPropertyValue(name).trim();
    out[name] = v.length > 0 ? v : FALLBACK[name];
  }
  return out;
}

/**
 * Resolves design tokens to runtime color strings for Recharts.
 * Recharts can't consume CSS vars directly inside its `fill` / `stroke`
 * props, so we read them from the document root once and feed
 * the literal values in. Returns the fallback palette during SSR.
 */
let cached: ChartTokens | null = null;

// Tokens don't change after load, so the "store" never notifies; the
// snapshot is read once and cached so React sees a stable reference.
const subscribe = () => () => {};
const getSnapshot = () => (cached ??= readTokens());
const getServerSnapshot = () => FALLBACK;

export function useChartTokens(): ChartTokens {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
