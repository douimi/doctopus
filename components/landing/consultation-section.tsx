'use client';

import { SectionFrame } from './section-frame';
import { ConsultationMockup } from './consultation-mockup';

export function ConsultationSection() {
  return (
    <SectionFrame>
      {(revealed) => (
        <>
          <div className="text-sky-400 text-[13px] uppercase tracking-[0.1em] font-semibold mb-4">
            01 — Consultation
          </div>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
            Une consultation complète.{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              Sans paperasse.
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
            Motif, antécédents, examen, diagnostic, suivi, ordonnance — tout dans une seule fenêtre. L&apos;autosave veille pour vous.
          </p>
          <ConsultationMockup revealed={revealed} />
        </>
      )}
    </SectionFrame>
  );
}
