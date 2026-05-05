'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Sparkles } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DisclaimerModal } from './disclaimer-modal';

type State =
  | { kind: 'disabled' }
  | { kind: 'no_credits'; balance: number }
  | { kind: 'ready'; balance: number; disclaimerAcknowledged: boolean };

function ChatPanel({
  consultationId,
  balance,
  disclaimerAcknowledged,
  readOnly,
}: {
  consultationId: string;
  balance: number;
  disclaimerAcknowledged: boolean;
  readOnly: boolean;
}) {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { consultationId },
    }),
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  const errMsg =
    error?.message?.match(/no_credits/) ? 'Crédits IA épuisés.' :
    error?.message?.match(/turn_cap/) ? 'Limite de 30 messages atteinte pour cette consultation.' :
    error?.message?.match(/token_cap/) ? 'Limite de tokens atteinte pour cette consultation.' :
    error?.message?.match(/not_configured/) ? 'Service IA temporairement indisponible.' :
    error ? 'Réessayez dans un instant.' : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    void sendMessage({ text });
  }

  return (
    <aside className="rounded-xl border border-border bg-card shadow-card flex flex-col h-full max-h-[calc(100vh-8rem)] overflow-hidden">
      <DisclaimerModal initiallyAcknowledged={disclaimerAcknowledged} />
      <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2 bg-muted/30">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex items-center justify-center size-6 rounded-md bg-primary-tint text-primary"
          >
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <span className="text-heading font-semibold leading-none">Assistant IA</span>
        </div>
        <span className="text-small text-muted-foreground tabular-nums">
          ~{balance} consultations restantes
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-muted-foreground space-y-2 text-body">
            <p>
              Posez une question clinique. La consultation utilisera{' '}
              <span className="font-medium text-foreground">1 crédit</span> dès le
              premier message.
            </p>
            <ul className="list-disc list-inside text-small space-y-1 marker:text-muted-foreground/60">
              <li>« Posologie pour cystite chez adulte allergique à la pénicilline ? »</li>
              <li>« Interactions de l&apos;ibuprofène avec un IEC ? »</li>
              <li>« Antécédents pertinents pour le motif actuel ? »</li>
            </ul>
          </div>
        ) : (
          messages.map((m) => {
            const text = m.parts
              .filter((p) => p.type === 'text')
              .map((p) => (p as { type: 'text'; text: string }).text)
              .join('');
            const isUser = m.role === 'user';
            return (
              <div key={m.id} className={isUser ? 'flex justify-end' : 'space-y-1'}>
                <div
                  className={
                    isUser
                      ? 'inline-block max-w-[85%] rounded-lg bg-primary-tint text-foreground px-3 py-2 text-body'
                      : 'inline-block max-w-[85%] rounded-lg bg-muted text-foreground px-3 py-2 text-body'
                  }
                >
                  <span className="whitespace-pre-wrap">{text}</span>
                </div>
                {!isUser ? (
                  <p className="text-small text-muted-foreground italic">
                    Suggestion IA — vérifiez avant toute décision clinique.
                  </p>
                ) : null}
              </div>
            );
          })
        )}
        {errMsg ? <Alert variant="danger">{errMsg}</Alert> : null}
      </div>

      {readOnly ? (
        <div className="border-t border-border px-4 py-3 text-small text-muted-foreground bg-muted/30">
          Consultation terminée — historique en lecture seule.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="border-t border-border flex gap-2 p-3 bg-muted/30"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Votre question…"
            disabled={isStreaming}
            aria-label="Question à l'assistant IA"
          />
          <Button
            type="submit"
            disabled={input.trim().length === 0}
            loading={isStreaming}
            size="default"
            aria-label="Envoyer"
          >
            <Send aria-hidden />
            Envoyer
          </Button>
        </form>
      )}
    </aside>
  );
}

export function AssistantPanel({
  consultationId,
  state,
  readOnly,
}: {
  consultationId: string;
  state: State;
  readOnly: boolean;
}) {
  if (state.kind === 'disabled') {
    return (
      <aside className="rounded-xl border border-border bg-card shadow-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex items-center justify-center size-6 rounded-md bg-muted text-muted-foreground"
          >
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <div className="text-heading font-semibold leading-none">Assistant IA</div>
        </div>
        <p className="text-body text-muted-foreground">
          Assistant IA non activé pour ce cabinet. Contactez le support.
        </p>
      </aside>
    );
  }
  if (state.kind === 'no_credits') {
    return (
      <aside className="rounded-xl border border-border bg-card shadow-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex items-center justify-center size-6 rounded-md bg-primary-tint text-primary"
          >
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <div className="text-heading font-semibold leading-none">Assistant IA</div>
        </div>
        <Alert variant="danger" title="Crédits IA épuisés">
          Contactez votre administrateur pour recharger.
        </Alert>
      </aside>
    );
  }

  return (
    <ChatPanel
      consultationId={consultationId}
      balance={state.balance}
      disclaimerAcknowledged={state.disclaimerAcknowledged}
      readOnly={readOnly}
    />
  );
}
