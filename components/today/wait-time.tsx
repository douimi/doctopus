'use client';

import { useEffect, useState } from 'react';
import { Hourglass } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';

export function formatMinutes(min: number): string {
  if (min < 1) return "à l'instant";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}`;
}

function toMs(d: Date | string): number {
  return typeof d === 'string' ? new Date(d).getTime() : d.getTime();
}

/** Re-renders every 30s so wait durations tick without a server round-trip. */
function useNow(): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Live ticking wait-duration pill.
 * Tone escalates: ≤10min calm, 11-20min warning, >20min danger.
 * SSR renders the initial value computed at request time, then the client
 * ticks every 30s.
 */
export function WaitTime({ since }: { since: Date }) {
  const now = useNow();
  const minutes = Math.max(0, Math.floor((now - toMs(since)) / 60_000));
  const variant: 'neutral' | 'warning' | 'danger' =
    minutes > 20 ? 'danger' : minutes > 10 ? 'warning' : 'neutral';

  return (
    <StatusBadge
      variant={variant}
      icon={Hourglass}
      aria-label={`En attente depuis ${formatMinutes(minutes)}`}
      className="tabular-nums"
    >
      {formatMinutes(minutes)}
    </StatusBadge>
  );
}

/** "max 24 min" hint for the KPI strip: longest current wait, ticking. */
export function LongestWait({ since }: { since: Array<Date | string> }) {
  const now = useNow();
  if (since.length === 0) return null;
  const oldest = Math.min(...since.map(toMs));
  const minutes = Math.max(0, Math.floor((now - oldest) / 60_000));
  return <>max {formatMinutes(minutes)}</>;
}
