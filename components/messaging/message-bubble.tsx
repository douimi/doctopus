'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Trash2,
  UserRound,
  Zap,
} from 'lucide-react';
import { DELETE_WINDOW_MS, isImageMime, type ChatMessage } from '@/lib/messaging/types';
import { cn } from '@/lib/utils';
import { fetchAttachmentUrl, useAttachmentUrl } from './attachment-url';
import { appointmentStatusLabel, bubbleTime, formatBytes } from './format';
import { useMessaging, useMessagingState } from './messaging-provider';
import { VoicePlayer } from './voice-player';

export type ReadState = 'none' | 'sent' | 'read';

export function MessageBubble({
  message,
  mine,
  senderLabel,
  readState,
  readBy,
  now,
}: {
  message: ChatMessage;
  mine: boolean;
  /** Shown above the first bubble of a run from someone else in the cabinet thread. */
  senderLabel: string | null;
  readState: ReadState;
  /** Cabinet thread: who read up to this (last own) message. */
  readBy?: string[];
  /** Clock from the thread (ticks), for the delete window. */
  now: number;
}) {
  const { retry, deleteMessage } = useMessaging();
  const [confirming, setConfirming] = useState(false);
  const deleted = message.deletedAt !== null;
  const canDelete =
    mine && !deleted && !message.pending && now - Date.parse(message.createdAt) < DELETE_WINDOW_MS;
  const hasMedia = !deleted && (message.kind === 'attachment' || message.kind === 'voice');
  const isImage = hasMedia && message.kind === 'attachment' && isImageMime(message.attachmentMime);

  return (
    <div className={cn('group/msg flex flex-col', mine ? 'items-end' : 'items-start')}>
      {senderLabel ? (
        <span className="mb-0.5 px-1 text-micro font-medium text-muted-foreground">{senderLabel}</span>
      ) : null}
      <div className={cn('flex max-w-[85%] items-center gap-1.5', mine && 'flex-row-reverse')}>
        <div
          className={cn(
            'min-w-0 rounded-2xl text-body leading-(--text-body--line-height)',
            isImage ? 'p-1' : 'px-3 py-1.5',
            mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted text-foreground',
            message.kind === 'quick' &&
              !deleted &&
              (mine ? 'ring-2 ring-primary/30 ring-offset-1 ring-offset-card' : 'bg-primary-tint text-primary-ink'),
            deleted && 'bg-transparent text-subtle-foreground italic ring-1 ring-inset ring-border',
            message.pending === 'failed' && 'opacity-70',
          )}
        >
          {deleted ? (
            'Message supprimé'
          ) : (
            <>
              {message.kind === 'attachment' ? <AttachmentView message={message} mine={mine} image={isImage} /> : null}
              {message.kind === 'voice' ? (
                <VoicePlayer
                  messageId={message.id}
                  localUrl={message.localUrl}
                  durationMs={message.voiceDurationMs}
                  mine={mine}
                />
              ) : null}
              {message.body ? (
                <p className={cn('whitespace-pre-wrap break-words', isImage && 'px-2 pt-1')}>
                  {message.kind === 'quick' ? (
                    <Zap className="mr-1 inline size-3.5 -translate-y-px" aria-label="Message rapide" />
                  ) : null}
                  {message.body}
                </p>
              ) : null}
              {message.patientId ? <PatientCard message={message} mine={mine} /> : null}
            </>
          )}
          <span
            className={cn(
              'flex items-center justify-end gap-0.5 text-[10px] tabular-nums',
              isImage && 'px-2 pb-0.5',
              mine && !deleted ? 'text-primary-foreground/75' : 'text-subtle-foreground',
            )}
          >
            {bubbleTime(message.createdAt)}
            {mine && !deleted ? <Tick pending={message.pending} readState={readState} /> : null}
          </span>
        </div>
        {canDelete ? (
          confirming ? (
            <span className="flex items-center gap-1 text-micro">
              <button
                type="button"
                className="rounded px-1.5 py-0.5 font-medium text-danger-ink hover:bg-danger-tint"
                onClick={() => {
                  setConfirming(false);
                  void deleteMessage(message.id);
                }}
              >
                Supprimer
              </button>
              <button
                type="button"
                className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted"
                onClick={() => setConfirming(false)}
              >
                Annuler
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Supprimer le message"
              className="rounded p-1 text-subtle-foreground opacity-0 transition-opacity group-hover/msg:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          )
        ) : null}
      </div>
      {message.pending === 'failed' ? (
        <button
          type="button"
          onClick={() => void retry(message)}
          className="mt-0.5 inline-flex items-center gap-1 px-1 text-micro font-medium text-danger-ink hover:underline"
        >
          <AlertCircle className="size-3" aria-hidden />
          Non envoyé · Réessayer
        </button>
      ) : null}
      {readBy && readBy.length > 0 ? (
        <span className="mt-0.5 px-1 text-micro text-subtle-foreground">Lu par {readBy.join(', ')}</span>
      ) : null}
    </div>
  );
}

function PatientCard({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const { appointmentStatuses } = useMessagingState();
  const status =
    (message.appointmentId ? appointmentStatuses[message.appointmentId] : undefined) ??
    message.appointmentStatus;
  const label = appointmentStatusLabel(status);
  return (
    <Link
      href={`/patients/${message.patientId}`}
      className={cn(
        'mt-1.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-small no-underline transition-colors',
        mine
          ? 'bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25'
          : 'bg-card text-foreground ring-1 ring-inset ring-border hover:bg-background',
      )}
    >
      <UserRound className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{message.patientName ?? 'Patient'}</span>
        {label ? (
          <span
            className={cn(
              'block truncate text-micro',
              mine ? 'text-primary-foreground/80' : status === 'waiting' ? 'text-warning-ink' : 'text-muted-foreground',
            )}
          >
            {label}
          </span>
        ) : null}
      </span>
      <ChevronRight className="size-4 shrink-0 opacity-70" aria-hidden />
    </Link>
  );
}

function AttachmentView({ message, mine, image }: { message: ChatMessage; mine: boolean; image: boolean }) {
  const url = useAttachmentUrl(message.id, { localUrl: message.localUrl, enabled: image && !message.pending });
  const [opening, setOpening] = useState(false);

  async function open(download: boolean) {
    if (message.localUrl) {
      window.open(message.localUrl, '_blank', 'noopener');
      return;
    }
    setOpening(true);
    const u = await fetchAttachmentUrl(message.id, download);
    setOpening(false);
    if (u) window.open(u, '_blank', 'noopener');
  }

  if (image) {
    return (
      <button
        type="button"
        onClick={() => void open(false)}
        className="relative block overflow-hidden rounded-xl bg-black/5"
        aria-label={`Ouvrir la photo ${message.attachmentName ?? ''}`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={message.attachmentName ?? 'Photo'}
            className="block max-h-72 w-auto max-w-[16rem] object-cover"
          />
        ) : (
          <span className="flex size-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin opacity-60" aria-hidden />
          </span>
        )}
        {message.pending === 'sending' ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="size-6 animate-spin text-white" aria-hidden />
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void open(true)}
      className={cn(
        'my-0.5 flex w-60 max-w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left',
        mine ? 'bg-primary-foreground/15 hover:bg-primary-foreground/25' : 'bg-card ring-1 ring-inset ring-border hover:bg-background',
      )}
      aria-label={`Télécharger ${message.attachmentName ?? 'le fichier'}`}
    >
      {opening || message.pending === 'sending' ? (
        <Loader2 className="size-6 shrink-0 animate-spin" aria-hidden />
      ) : (
        <FileText className="size-6 shrink-0" aria-hidden />
      )}
      <span className="min-w-0">
        <span className="block truncate text-small font-medium">{message.attachmentName ?? 'Fichier'}</span>
        <span className={cn('block text-micro', mine ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
          PDF · {formatBytes(message.attachmentBytes)}
        </span>
      </span>
    </button>
  );
}

function Tick({ pending, readState }: { pending: ChatMessage['pending']; readState: ReadState }) {
  if (pending === 'sending') return <Clock className="size-3" aria-label="Envoi…" />;
  if (pending === 'failed') return <AlertCircle className="size-3" aria-label="Échec" />;
  if (readState === 'read') return <CheckCheck className="size-3.5" aria-label="Lu" />;
  if (readState === 'sent') return <Check className="size-3.5" aria-label="Envoyé" />;
  return null;
}
