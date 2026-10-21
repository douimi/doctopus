import { Check } from 'lucide-react';
import { MButton, MLabel, MPanel } from './mockup-ui';

const METHODS = ['Espèces', 'Carte', 'Chèque', 'Virement', 'Autre'];

/**
 * Two dialogs side by side, as they exist in the app:
 * FinalizePricingDialog (doctor) and EncaisserDialog (assistant).
 */
export function PaymentsMockup() {
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
      <div className="min-w-0">
        <MLabel className="mb-1.5">Médecin · clôture</MLabel>
        <MPanel className="p-3.5">
          <div className="mb-3 text-[13.5px] font-semibold">Tarification et clôture</div>
          <div className="mb-1 text-[11.5px] font-medium text-slate-700">Prix (MAD)</div>
          <div className="rounded-md border border-slate-300 px-3 py-2 text-[14px] font-medium tabular-nums">250</div>
          <div className="mt-2.5 flex items-center gap-2 text-[12px] text-slate-700">
            <span className="size-3.5 rounded-[3px] border border-slate-400 bg-white" />
            Gratuit
            <span className="text-[11px] text-slate-500">(coché d’office pour un suivi)</span>
          </div>
          <MButton className="mt-3.5 h-8 w-full text-[12px]">Terminer la consultation</MButton>
        </MPanel>
      </div>

      <div className="min-w-0">
        <MLabel className="mb-1.5">Assistant(e) · encaissement</MLabel>
        <MPanel className="p-3.5">
          <div className="mb-3 text-[13.5px] font-semibold">Encaisser le paiement de BERRADA Yasmine</div>
          <div className="text-[12px]">
            <span className="text-slate-500">Prix : </span>
            <span className="font-medium tabular-nums">250,00 MAD</span>
          </div>
          <div className="mb-1.5 mt-2.5 text-[11.5px] font-medium text-slate-700">Méthode de paiement</div>
          <div className="flex flex-wrap gap-1">
            {METHODS.map((m, i) => (
              <span
                key={m}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] ${
                  i === 0 ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                {i === 0 ? <Check className="size-3" /> : null}
                {m}
              </span>
            ))}
          </div>
          <div className="mt-3.5 flex justify-end gap-2">
            <MButton variant="outline" className="h-8 text-[12px]">Annuler</MButton>
            <MButton className="h-8 text-[12px]">Encaisser</MButton>
          </div>
        </MPanel>
      </div>
    </div>
  );
}
