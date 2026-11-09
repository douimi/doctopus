'use client';

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { AtSign, FileText, Mic, Paperclip, SendHorizontal, UserRound, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import { useSetTyping } from '@/components/shell/tenant-realtime';
import { canRecordVoice, prepareImage } from '@/lib/messaging/media';
import {
  ATTACHMENT_MAX_BYTES,
  DOC_MIMES,
  IMAGE_MIMES,
  MESSAGE_MAX_LENGTH,
  baseMime,
  isImageMime,
  type PatientRef,
} from '@/lib/messaging/types';
import { cn } from '@/lib/utils';
import { formatBytes } from './format';
import { useComposeRequest, useMessaging, useMessagingState } from './messaging-provider';
import { PatientMentionPicker } from './patient-mention';
import { VoiceRecorder } from './voice-recorder';

const TYPING_IDLE_MS = 4000;
const ACCEPT = [...IMAGE_MIMES, ...DOC_MIMES].join(',');

type Draft = { text: string; patient: PatientRef | null };
// Drafts survive switching conversations / closing the dock.
const drafts = new Map<string, Draft>();

export function Composer({
  conversationId,
  disabled,
  autoFocus,
}: {
  conversationId: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const { send } = useMessaging();
  const { quickReplies } = useMessagingState();
  const compose = useComposeRequest();
  const setTyping = useSetTyping();
  const initial = drafts.get(conversationId);
  const [text, setText] = useState(initial?.text ?? '');
  const [patient, setPatient] = useState<PatientRef | null>(initial?.patient ?? null);
  const [file, setFile] = useState<{ file: File; preview: string | null } | null>(null);
  const [picking, setPicking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [draftFor, setDraftFor] = useState(conversationId);
  const [composeNonce, setComposeNonce] = useState<number | null>(null);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceSupported = canRecordVoice();

  // Swap the draft when the conversation changes (adjust-state-on-prop pattern).
  if (draftFor !== conversationId) {
    setDraftFor(conversationId);
    const d = drafts.get(conversationId);
    setText(d?.text ?? '');
    setPatient(d?.patient ?? null);
    setFile(null);
    setPicking(false);
    setRecording(false);
  }

  // "Envoyer un message à propos de ce patient" (from /today).
  if (compose && compose.conversationId === conversationId && compose.nonce !== composeNonce) {
    setComposeNonce(compose.nonce);
    setPatient(compose.patient);
  }

  useEffect(() => {
    drafts.set(conversationId, { text, patient });
  }, [conversationId, text, patient]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus, conversationId, composeNonce]);

  useEffect(
    () => () => {
      if (idleRef.current) clearTimeout(idleRef.current);
      setTyping(null);
    },
    [conversationId, setTyping],
  );

  useEffect(() => {
    const url = file?.preview;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  function stopTyping() {
    if (idleRef.current) clearTimeout(idleRef.current);
    setTyping(null);
  }

  function update(value: string) {
    // "@" at the start of a word opens the patient picker.
    const typedAt = value.length === text.length + 1 && /(^|\s)@$/.test(value);
    if (typedAt) {
      setText(value.slice(0, -1));
      setPicking(true);
      return;
    }
    setText(value);
    if (value.trim()) {
      setTyping(conversationId);
      if (idleRef.current) clearTimeout(idleRef.current);
      idleRef.current = setTimeout(() => setTyping(null), TYPING_IDLE_MS);
    } else {
      stopTyping();
    }
  }

  function reset() {
    setText('');
    setPatient(null);
    setFile(null);
    stopTyping();
    ref.current?.focus();
  }

  function submit() {
    if (disabled) return;
    const body = text.trim();
    if (body.length > MESSAGE_MAX_LENGTH) return;
    if (file) {
      void send(conversationId, { kind: 'attachment', file: file.file, body, patient });
      reset();
      return;
    }
    if (!body && !patient) return;
    void send(conversationId, { kind: 'text', body, patient });
    reset();
  }

  function sendQuick(body: string) {
    if (disabled) return;
    void send(conversationId, { kind: 'quick', body, patient });
    setPatient(null);
    stopTyping();
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    const mime = baseMime(picked.type);
    if (![...IMAGE_MIMES, ...DOC_MIMES].includes(mime as never)) {
      showToast({ title: 'Format non pris en charge', description: 'Photos (JPEG, PNG, WebP) ou PDF.', variant: 'warning' });
      return;
    }
    const ready = isImageMime(mime) ? await prepareImage(picked) : picked;
    if (ready.size > ATTACHMENT_MAX_BYTES) {
      showToast({ title: 'Fichier trop volumineux', description: '10 Mo maximum.', variant: 'warning' });
      return;
    }
    setFile({ file: ready, preview: isImageMime(mime) ? URL.createObjectURL(ready) : null });
    ref.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  const tooLong = text.length > MESSAGE_MAX_LENGTH;
  const nearLimit = text.length > MESSAGE_MAX_LENGTH - 200;
  const canSend = !disabled && !tooLong && (!!text.trim() || !!patient || !!file);
  const showMic = voiceSupported && !text.trim() && !file;

  return (
    <div className="relative border-t border-border bg-card">
      {picking ? (
        <PatientMentionPicker
          onSelect={(p) => {
            setPatient(p);
            setPicking(false);
            ref.current?.focus();
          }}
          onClose={() => {
            setPicking(false);
            ref.current?.focus();
          }}
        />
      ) : null}

      {quickReplies.length > 0 && !recording && !disabled ? (
        <div
          className="flex gap-1.5 overflow-x-auto px-2.5 pt-2 [scrollbar-width:none]"
          role="toolbar"
          aria-label="Messages rapides"
        >
          {quickReplies.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => sendQuick(q.body)}
              title={q.body}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-pill border border-border bg-background px-2.5 text-small text-foreground transition-colors hover:border-primary/40 hover:bg-primary-tint hover:text-primary-ink"
            >
              <Zap className="size-3 text-primary" aria-hidden />
              {q.label}
            </button>
          ))}
        </div>
      ) : null}

      {(patient || file) && !recording ? (
        <div className="flex flex-wrap gap-1.5 px-2.5 pt-2">
          {patient ? (
            <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-pill bg-primary-tint pl-2 pr-1 text-small font-medium text-primary-ink">
              <UserRound className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{patient.name}</span>
              <button
                type="button"
                onClick={() => setPatient(null)}
                aria-label={`Retirer ${patient.name}`}
                className="rounded-full p-0.5 hover:bg-primary/15"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          ) : null}
          {file ? (
            <span className="inline-flex h-12 max-w-full items-center gap-2 rounded-lg border border-border bg-background p-1 pr-1.5 text-small">
              {file.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.preview} alt="" className="size-10 rounded object-cover" />
              ) : (
                <span className="inline-flex size-10 items-center justify-center rounded bg-muted text-muted-foreground">
                  <FileText className="size-5" aria-hidden />
                </span>
              )}
              <span className="min-w-0">
                <span className="block max-w-48 truncate text-foreground">{file.file.name}</span>
                <span className="block text-micro text-muted-foreground">{formatBytes(file.file.size)}</span>
              </span>
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label="Retirer la pièce jointe"
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      <form
        className="p-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {recording ? (
          <VoiceRecorder
            onCancel={() => setRecording(false)}
            onSend={(blob, mime, durationMs) => {
              setRecording(false);
              void send(conversationId, { kind: 'voice', blob, mime, durationMs, patient });
              setPatient(null);
            }}
          />
        ) : (
          <div className="flex items-end gap-1.5">
            <div className="flex shrink-0 items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                onClick={() => setPicking((v) => !v)}
                aria-label="Mentionner un patient"
                title="Mentionner un patient (@)"
              >
                <AtSign aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Joindre une photo ou un PDF"
                title="Joindre une photo ou un PDF"
              >
                <Paperclip aria-hidden />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => void onFile(e)}
                data-testid="composer-file-input"
              />
            </div>
            <label className="sr-only" htmlFor={`composer-${conversationId}`}>
              Votre message
            </label>
            <textarea
              id={`composer-${conversationId}`}
              ref={ref}
              value={text}
              onChange={(e) => update(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={disabled}
              rows={1}
              placeholder={
                disabled
                  ? 'Ce membre ne fait plus partie du cabinet'
                  : file
                    ? 'Ajouter une légende…'
                    : 'Écrire un message… (@ pour un patient)'
              }
              className={cn(
                'field-sizing-content max-h-40 min-h-9 min-w-0 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-body leading-(--text-body--line-height) text-foreground',
                'placeholder:text-subtle-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
                tooLong && 'border-danger',
              )}
            />
            {showMic ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                disabled={disabled}
                onClick={() => setRecording(true)}
                aria-label="Enregistrer une note vocale"
                title="Note vocale"
              >
                <Mic aria-hidden />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!canSend} aria-label="Envoyer">
                <SendHorizontal aria-hidden />
              </Button>
            )}
          </div>
        )}
        {nearLimit && !recording ? (
          <p className={cn('mt-1 text-right text-micro tabular-nums', tooLong ? 'text-danger-ink' : 'text-subtle-foreground')}>
            {text.length} / {MESSAGE_MAX_LENGTH}
          </p>
        ) : null}
      </form>
    </div>
  );
}
