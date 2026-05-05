import { SectionFrame } from './section-frame';
import { StatsMockup } from './stats-mockup';

export function StatsSection() {
  return (
    <SectionFrame>
      {(revealed) => (
        <>
          <div className="text-sky-400 text-[13px] uppercase tracking-[0.1em] font-semibold mb-4">
            04 — Statistiques
          </div>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
            Votre cabinet,{' '}
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              en chiffres.
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
            Recettes du jour, du mois, de l&apos;année. Méthodes de paiement, paiements en attente, top patients. Tout ce qu&apos;il faut pour piloter.
          </p>
          <StatsMockup revealed={revealed} />
        </>
      )}
    </SectionFrame>
  );
}
