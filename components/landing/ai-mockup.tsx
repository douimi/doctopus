'use client';

import { Sparkles } from 'lucide-react';
import { usePrefersReducedMotion, useTypewriter } from './animations';
import { Caret, MPanel } from './mockup-ui';

const USER_QUESTION = 'Je peux lui prescrire de l’amoxicilline ?';
const BOT_RESPONSE = `Non : une allergie à la pénicilline figure dans son dossier, l’amoxicilline est contre-indiquée.

Pour une bronchite aiguë probablement virale, un antibiotique n’est en général pas indiqué. Traitement symptomatique : paracétamol (DOLIPRANE 1 g, 13,10 MAD).

Asthme connu : à réévaluer en cas de sifflements ou de dyspnée.`;

const BOT_DELAY = 1100;

export function AIMockup({ revealed }: { revealed: boolean }) {
  const reduce = usePrefersReducedMotion();
  const typed = useTypewriter(BOT_RESPONSE, {
    startWhen: revealed && !reduce,
    charDelayMs: 14,
    startDelayMs: BOT_DELAY,
  });
  const bot = reduce ? BOT_RESPONSE : typed;
  const thinking = revealed && !reduce && bot.length === 0;
  const done = bot.length === BOT_RESPONSE.length;
  const showQuestion = reduce || revealed;

  return (
    <div className="p-3 sm:p-4">
      <MPanel className="overflow-hidden">
        {/* The one gradient the app keeps: the AI panel's 2px hairline. */}
        <div className="h-0.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500" />
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-[12.5px] font-semibold">
          <Sparkles className="size-3.5 text-indigo-600" />
          Assistant clinique
          <span className="ml-auto text-[10.5px] font-normal text-slate-500">Nom et CIN jamais transmis</span>
        </div>
        <div className="min-h-[15rem] space-y-2 p-3 text-[12.5px] leading-relaxed">
          <div
            className={`ml-auto max-w-[85%] rounded-lg bg-slate-100 px-3 py-2 transition-opacity duration-200 ${showQuestion ? 'opacity-100' : 'opacity-0'}`}
          >
            {USER_QUESTION}
          </div>
          {thinking ? (
            <div className="inline-flex gap-1 rounded-lg bg-sky-50 px-3 py-2.5">
              <span className="size-1.5 rounded-full bg-sky-400 motion-safe:animate-bounce" />
              <span className="size-1.5 rounded-full bg-sky-400 motion-safe:animate-bounce [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-sky-400 motion-safe:animate-bounce [animation-delay:300ms]" />
            </div>
          ) : null}
          {bot.length > 0 ? (
            <div className="max-w-[92%] whitespace-pre-line rounded-lg bg-sky-50 px-3 py-2 text-slate-900">
              {bot}
              <Caret show={!done} />
            </div>
          ) : null}
        </div>
        <div className="border-t border-slate-200 p-2.5">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-400">
            Posez une question sur ce patient…
          </div>
        </div>
      </MPanel>
    </div>
  );
}
