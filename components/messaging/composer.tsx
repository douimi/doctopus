'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSetTyping } from '@/components/shell/tenant-realtime';
import { MESSAGE_MAX_LENGTH } from '@/lib/messaging/types';
import { cn } from '@/lib/utils';
import { useMessaging } from './messaging-provider';

const TYPING_IDLE_MS = 4000;

// Drafts survive switching conversations / closing the dock.
const drafts = new Map<string, string>();

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
  const setTyping = useSetTyping();
  const [text, setText] = useState(() => drafts.get(conversationId) ?? '');
  const [draftFor, setDraftFor] = useState(conversationId);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Swap the draft when the conversation changes (adjust-state-on-prop pattern).
  if (draftFor !== conversationId) {
    setDraftFor(conversationId);
    setText(drafts.get(conversationId) ?? '');
  }

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus, conversationId]);

  useEffect(
    () => () => {
      if (idleRef.current) clearTimeout(idleRef.current);
      setTyping(null);
    },
    [conversationId, setTyping],
  );

  function update(value: string) {
    setText(value);
    drafts.set(conversationId, value);
    if (value.trim()) {
      setTyping(conversationId);
      if (idleRef.current) clearTimeout(idleRef.current);
      idleRef.current = setTimeout(() => setTyping(null), TYPING_IDLE_MS);
    } else {
      setTyping(null);
    }
  }

  function submit() {
    const body = text.trim();
    if (!body || body.length > MESSAGE_MAX_LENGTH || disabled) return;
    update('');
    setTyping(null);
    void send(conversationId, body);
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

  return (
    <form
      className="border-t border-border bg-card p-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-end gap-2">
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
          placeholder={disabled ? 'Ce membre ne fait plus partie du cabinet' : 'Écrire un message…'}
          className={cn(
            'field-sizing-content max-h-40 min-h-9 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-body leading-(--text-body--line-height) text-foreground',
            'placeholder:text-subtle-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
            tooLong && 'border-danger',
          )}
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !text.trim() || tooLong}
          aria-label="Envoyer"
        >
          <SendHorizontal aria-hidden />
        </Button>
      </div>
      {nearLimit ? (
        <p className={cn('mt-1 text-right text-micro tabular-nums', tooLong ? 'text-danger-ink' : 'text-subtle-foreground')}>
          {text.length} / {MESSAGE_MAX_LENGTH}
        </p>
      ) : (
        <p className="mt-1 hidden text-micro text-subtle-foreground md:block">
          Entrée pour envoyer · Maj+Entrée pour aller à la ligne
        </p>
      )}
    </form>
  );
}
