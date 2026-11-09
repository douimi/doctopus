'use client';

import { useState } from 'react';
import { AlertCircle, Check, CheckCheck, Clock, Trash2 } from 'lucide-react';
import { DELETE_WINDOW_MS, type ChatMessage } from '@/lib/messaging/types';
import { cn } from '@/lib/utils';
import { bubbleTime } from './format';
import { useMessaging } from './messaging-provider';

export type ReadState = 'none' | 'sent' | 'read';

export function MessageBubble({
  message,
  mine,
  showSender,
  readState,
  readBy,
  now,
}: {
  message: ChatMessage;
  mine: boolean;
  /** First bubble of a run from someone else in the cabinet thread. */
  showSender: boolean;
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
    mine &&
    !deleted &&
    !message.pending &&
    now - Date.parse(message.createdAt) < DELETE_WINDOW_MS;

  return (
    <div className={cn('group/msg flex flex-col', mine ? 'items-end' : 'items-start')}>
      {showSender ? (
        <span className="mb-0.5 px-1 text-micro font-medium text-muted-foreground">
          {message.senderName}
        </span>
      ) : null}
      <div className={cn('flex max-w-[85%] items-center gap-1.5', mine && 'flex-row-reverse')}>
        <div
          className={cn(
            'rounded-2xl px-3 py-1.5 text-body leading-(--text-body--line-height) whitespace-pre-wrap break-words',
            mine
              ? 'rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-bl-md bg-muted text-foreground',
            deleted && 'bg-transparent text-subtle-foreground italic ring-1 ring-inset ring-border',
            message.pending === 'failed' && 'opacity-70',
          )}
        >
          {deleted ? 'Message supprimé' : message.body}
          <span
            className={cn(
              'ml-2 inline-flex translate-y-0.5 items-center gap-0.5 align-baseline text-[10px] tabular-nums',
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
        <span className="mt-0.5 px-1 text-micro text-subtle-foreground">
          Lu par {readBy.join(', ')}
        </span>
      ) : null}
    </div>
  );
}

function Tick({ pending, readState }: { pending: ChatMessage['pending']; readState: ReadState }) {
  if (pending === 'sending') return <Clock className="size-3" aria-label="Envoi…" />;
  if (pending === 'failed') return <AlertCircle className="size-3" aria-label="Échec" />;
  if (readState === 'read') return <CheckCheck className="size-3.5" aria-label="Lu" />;
  if (readState === 'sent') return <Check className="size-3.5" aria-label="Envoyé" />;
  return null;
}
