'use client';

import { useEffect, useRef, useState } from 'react';
import { SendHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import { pickRecorderMime } from '@/lib/messaging/media';
import { VOICE_MAX_MS } from '@/lib/messaging/types';
import { formatDuration } from './format';

/**
 * Records a voice note as soon as it mounts. "Envoyer" stops and hands the
 * blob over; the bin discards it. Auto-sends at the 2-minute cap.
 */
export function VoiceRecorder({
  onSend,
  onCancel,
}: {
  onSend: (blob: Blob, mime: string, durationMs: number) => void;
  onCancel: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [ready, setReady] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const finishRef = useRef<'send' | 'cancel'>('cancel');
  const cbRef = useRef({ onSend, onCancel });
  useEffect(() => {
    cbRef.current = { onSend, onCancel };
  });

  useEffect(() => {
    let cancelled = false;
    let tick: ReturnType<typeof setInterval> | null = null;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const mime = pickRecorderMime();
        const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        recorderRef.current = rec;
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const duration = Date.now() - startedRef.current;
          const type = rec.mimeType || mime || 'audio/webm';
          if (finishRef.current === 'send' && chunksRef.current.length > 0 && duration > 500) {
            cbRef.current.onSend(new Blob(chunksRef.current, { type }), type, Math.min(duration, VOICE_MAX_MS));
          } else {
            cbRef.current.onCancel();
          }
        };
        rec.start(250);
        startedRef.current = Date.now();
        setReady(true);
        tick = setInterval(() => {
          const ms = Date.now() - startedRef.current;
          setElapsed(ms);
          if (ms >= VOICE_MAX_MS && rec.state === 'recording') {
            finishRef.current = 'send';
            rec.stop();
          }
        }, 200);
      } catch {
        showToast({
          title: 'Micro indisponible',
          description: 'Autorisez l’accès au micro dans le navigateur pour enregistrer une note vocale.',
          variant: 'warning',
        });
        cbRef.current.onCancel();
      }
    })();
    return () => {
      cancelled = true;
      if (tick) clearInterval(tick);
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') {
        finishRef.current = 'cancel';
        rec.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function finish(how: 'send' | 'cancel') {
    finishRef.current = how;
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    else if (how === 'cancel') onCancel();
  }

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Enregistrement d’une note vocale">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => finish('cancel')}
        aria-label="Annuler la note vocale"
      >
        <Trash2 aria-hidden />
      </Button>
      <div className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-danger/30 bg-danger-tint px-3 text-body text-danger-ink">
        <span className="size-2.5 animate-pulse rounded-full bg-danger" aria-hidden />
        <span className="tabular-nums" aria-live="off">
          {ready ? formatDuration(elapsed) : 'Micro…'}
        </span>
        <span className="ml-auto text-micro text-danger-ink/80">max {formatDuration(VOICE_MAX_MS)}</span>
      </div>
      <Button
        type="button"
        size="icon"
        onClick={() => finish('send')}
        disabled={!ready}
        aria-label="Envoyer la note vocale"
      >
        <SendHorizontal aria-hidden />
      </Button>
    </div>
  );
}
