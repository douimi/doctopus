'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
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

  // AI SDK v6: useChat uses ChatInit with a transport field.
  // No handleInputChange/handleSubmit — use sendMessage({ text }) directly.
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
    <aside className="rounded-md border flex flex-col h-full max-h-[calc(100vh-8rem)]">
      <DisclaimerModal initiallyAcknowledged={disclaimerAcknowledged} />
      <div className="border-b px-3 py-2 text-sm font-medium flex items-center justify-between">
        <span>Assistant IA</span>
        <span className="text-xs text-muted-foreground">~{balance} consultations restantes</span>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3 text-sm">
        {messages.length === 0 ? (
          <div className="text-muted-foreground space-y-2">
            <p>Posez une question clinique. La consultation utilisera 1 crédit dès le premier message.</p>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              <li>« Posologie pour cystite chez adulte allergique à la pénicilline ? »</li>
              <li>« Interactions de l&apos;ibuprofène avec un IEC ? »</li>
              <li>« Antécédents pertinents pour le motif actuel ? »</li>
            </ul>
          </div>
        ) : (
          messages.map((m) => {
            // AI SDK v6: messages have a `parts` array, not a flat `content` string.
            const text = m.parts
              .filter((p) => p.type === 'text')
              .map((p) => (p as { type: 'text'; text: string }).text)
              .join('');
            return (
              <div key={m.id} className={m.role === 'user' ? 'text-right' : ''}>
                <div
                  className={
                    m.role === 'user'
                      ? 'inline-block rounded bg-blue-50 px-2 py-1'
                      : 'inline-block rounded bg-muted px-2 py-1'
                  }
                >
                  {m.role === 'assistant' ? (
                    <span className="mr-1 text-[10px] uppercase font-semibold text-muted-foreground">IA</span>
                  ) : null}
                  <span className="whitespace-pre-wrap">{text}</span>
                </div>
                {m.role === 'assistant' ? (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Suggestion IA — vérifiez avant toute décision clinique.
                  </p>
                ) : null}
              </div>
            );
          })
        )}
        {errMsg ? <p className="text-xs text-danger">{errMsg}</p> : null}
      </div>

      {readOnly ? (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          Consultation terminée — historique en lecture seule.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="border-t flex gap-2 p-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Votre question…"
            disabled={isStreaming}
          />
          <Button type="submit" disabled={isStreaming || input.trim().length === 0} size="sm">
            {isStreaming ? '…' : 'Envoyer'}
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
      <aside className="rounded-md border p-4 text-sm text-muted-foreground">
        Assistant IA non activé pour ce cabinet. Contactez le support.
      </aside>
    );
  }
  if (state.kind === 'no_credits') {
    return (
      <aside className="rounded-md border p-4 space-y-2">
        <div className="font-medium text-sm">Assistant IA</div>
        <p className="text-sm text-danger">
          Crédits IA épuisés. Contactez votre administrateur pour recharger.
        </p>
      </aside>
    );
  }

  // kind === 'ready': render the chat panel.
  // useChat must be called at the top level of a component (Rules of Hooks),
  // so we delegate to ChatPanel which always calls useChat unconditionally.
  return (
    <ChatPanel
      consultationId={consultationId}
      balance={state.balance}
      disclaimerAcknowledged={state.disclaimerAcknowledged}
      readOnly={readOnly}
    />
  );
}
