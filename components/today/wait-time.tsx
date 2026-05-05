'use client';

import { useEffect, useState } from 'react';
import { Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatMinutes(min: number): string {
  if (min < 1) return "à l'instant";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}`;
}

/**
 * Live ticking wait-duration pill.
 * Tone escalates: ≤10min calm, 11-20min warning, >20min danger.
 * SSR renders the initial value computed at request time, then the client
 * ticks every minute. No hydration mismatch because we render the same
 * snapshot on server and client; effects only update post-mount.
 */
export function WaitTime({ since }: { since: Date }) {
  const sinceMs = typeof since === 'string' ? new Date(since).getTime() : since.getTime();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const minutes = Math.max(0, Math.floor((now - sinceMs) / 60_000));
  const tone =
    minutes > 20
      ? 'bg-danger-tint text-danger border-danger/20'
      : minutes > 10
        ? 'bg-warning-tint text-warning-foreground border-warning/30'
        : 'bg-muted text-muted-foreground border-border';

  return (
    <span
      aria-label={`En attente depuis ${formatMinutes(minutes)}`}
      className={cn(
        'inline-flex items-center gap-1 text-small font-medium px-2 py-0.5 rounded-pill border tabular-nums',
        tone,
      )}
    >
      <Hourglass className="size-3" aria-hidden />
      {formatMinutes(minutes)}
    </span>
  );
}
