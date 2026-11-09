'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchAttachmentUrl } from './attachment-url';
import { formatDuration } from './format';

/** Compact voice-note player; the signed URL is only fetched on first play. */
export function VoicePlayer({
  messageId,
  localUrl,
  durationMs,
  mine,
}: {
  messageId: string;
  localUrl?: string;
  durationMs: number | null;
  mine: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  async function toggle() {
    const existing = audioRef.current;
    if (existing && state === 'playing') {
      existing.pause();
      return;
    }
    if (existing && state === 'paused') {
      void existing.play();
      return;
    }
    setState('loading');
    const src = localUrl ?? (await fetchAttachmentUrl(messageId));
    if (!src) {
      setState('error');
      return;
    }
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.onplay = () => setState('playing');
    audio.onpause = () => setState((s) => (s === 'loading' ? s : 'paused'));
    audio.onended = () => {
      setState('idle');
      setProgress(0);
      setPosition(0);
      audioRef.current = null;
    };
    audio.onerror = () => setState('error');
    audio.ontimeupdate = () => {
      const total = Number.isFinite(audio.duration) ? audio.duration : (durationMs ?? 0) / 1000;
      setPosition(audio.currentTime * 1000);
      setProgress(total > 0 ? Math.min(1, audio.currentTime / total) : 0);
    };
    try {
      await audio.play();
    } catch {
      setState('error');
    }
  }

  const playing = state === 'playing';
  return (
    <div className="flex w-56 max-w-full items-center gap-2.5 py-0.5">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={playing ? 'Pause' : 'Écouter la note vocale'}
        className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-full',
          mine ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary text-primary-foreground',
        )}
      >
        {state === 'loading' ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : playing ? (
          <Pause className="size-4" aria-hidden />
        ) : (
          <Play className="size-4 translate-x-px" aria-hidden />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className={cn('h-1 overflow-hidden rounded-full', mine ? 'bg-primary-foreground/25' : 'bg-border')}>
          <div
            className={cn('h-full rounded-full', mine ? 'bg-primary-foreground' : 'bg-primary')}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className={cn('mt-1 text-[11px] tabular-nums', mine ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
          {state === 'error'
            ? 'Lecture impossible'
            : `${state === 'idle' ? '' : `${formatDuration(position)} / `}${formatDuration(durationMs)}`}
        </div>
      </div>
    </div>
  );
}
