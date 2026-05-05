import { SectionFrame } from './section-frame';

export function PricingSection() {
  return (
    <SectionFrame>
      <div className="text-sky-400 text-[13px] uppercase tracking-[0.1em] font-semibold mb-4">
        03 — Tarification & paiements
      </div>
      <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight max-w-3xl text-center">
        Du diagnostic au paiement.{' '}
        <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
          Sans friction.
        </span>
      </h2>
      <p className="text-xl text-white/70 max-w-2xl mt-6 text-center">
        Le médecin clôture, l&apos;assistant encaisse — chacun voit ce qu&apos;il doit voir. Espèces, carte, chèque, virement.
      </p>

      <div className="mt-16 max-w-[900px] w-full bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-2xl p-2 shadow-2xl">
        <div className="flex gap-1.5 px-3.5 py-2.5">
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
        </div>
        <div className="bg-[#f5f5f5] text-slate-900 rounded-xl p-6 grid grid-cols-2 gap-5">
          <div>
            <div className="text-sm font-semibold text-slate-600 mb-3">Médecin · Clôture</div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="font-semibold text-base mb-4">Tarification et clôture</div>
              <div className="text-[11px] uppercase text-slate-400 tracking-wide mb-1.5 font-medium">
                Prix (MAD)
              </div>
              <div className="w-full px-3 py-3 border border-slate-200 rounded-lg text-lg font-medium tabular-nums">
                250
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm text-slate-600">
                <span className="text-slate-400">☐</span> Gratuit
              </div>
              <div className="w-full mt-4 px-4 py-3 bg-slate-900 text-white rounded-lg text-sm font-medium text-center">
                Terminer la consultation
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-600 mb-3">Assistant · Paiements</div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-3 py-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                  BY
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">Berrada Yasmine</div>
                  <div className="text-xs text-slate-400">il y a 2 min</div>
                </div>
                <div className="font-semibold tabular-nums text-sm shrink-0">250,00 MAD</div>
                <div className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium">
                  Encaisser
                </div>
              </div>
              <div className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-pink-500 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                  AA
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">Alami Ali</div>
                  <div className="text-xs text-slate-400">hier 18:30</div>
                </div>
                <div className="font-semibold tabular-nums text-sm shrink-0">300,00 MAD</div>
                <div className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium">
                  Encaisser
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
