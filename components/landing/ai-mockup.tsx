'use client';

import { useTypewriter } from './animations';

const USER_QUESTION = 'Quelles sont les contre-indications de l\'ibuprofène pour cette patiente?';
const BOT_RESPONSE = `Compte tenu du contexte clinique (toux persistante, pas d'antécédents notables), l'ibuprofène est en principe utilisable. Cependant, surveillez :

• allergie aux AINS (non documentée chez cette patiente — à confirmer)
• troubles digestifs récents
• prise concomitante d'anticoagulants

Le paracétamol reste le choix de première intention pour cette indication virale.`;

const THINKING_DELAY = 400;
const BOT_TYPE_DELAY = THINKING_DELAY + 800;

export function AIMockup({ revealed }: { revealed: boolean }) {
  const botText = useTypewriter(BOT_RESPONSE, {
    startWhen: revealed,
    charDelayMs: 25,
    startDelayMs: BOT_TYPE_DELAY,
  });
  const showThinking = revealed && botText.length === 0;
  const botDone = botText.length === BOT_RESPONSE.length;

  return (
    <div className="bg-[#f5f5f5] text-slate-900 p-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="font-semibold text-sm mb-3.5 flex items-center gap-2">
            🤖 Assistant clinique
          </div>
          {revealed ? (
            <div className="bg-slate-100 rounded-xl px-3.5 py-2.5 mb-2 ml-auto max-w-[90%] text-sm leading-relaxed animate-in fade-in-0 slide-in-from-right-2 duration-300">
              {USER_QUESTION}
            </div>
          ) : null}
          {showThinking ? (
            <div className="bg-sky-50 text-sky-900 rounded-xl px-3.5 py-2.5 max-w-[90%] inline-flex gap-1 animate-in fade-in-0 duration-200">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:300ms]" />
            </div>
          ) : null}
          {botText.length > 0 ? (
            <div className="bg-sky-50 text-sky-900 rounded-xl px-3.5 py-2.5 max-w-[90%] text-sm leading-relaxed whitespace-pre-line">
              {botText}
              {!botDone ? <span className="opacity-60">|</span> : null}
            </div>
          ) : null}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 mt-3 text-sm text-slate-400">
            Posez une question…
          </div>
        </div>
    </div>
  );
}
