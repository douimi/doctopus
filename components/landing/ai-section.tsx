'use client';

import { SectionFrame } from './section-frame';
import { AIMockup } from './ai-mockup';

export function AISection() {
  return (
    <SectionFrame>
      {(revealed) => (
        <>
          <div className="text-sky-400 text-[13px] uppercase tracking-[0.1em] font-semibold mb-4">
            05 — Assistant clinique IA
          </div>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
            Un coup de main,{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              quand vous en avez besoin.
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
            Posez une question — l&apos;assistant connaît le motif, les allergies, les antécédents du patient. Sans jamais transmettre son identité.
          </p>
          <AIMockup revealed={revealed} />
          <p className="text-sm text-white/50 mt-6 text-center">
            Anthropic · OpenAI · Mistral, au choix. Données patient anonymisées avant transmission.
          </p>
        </>
      )}
    </SectionFrame>
  );
}
