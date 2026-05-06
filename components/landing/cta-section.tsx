import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { FREE_TRIAL_MONTHS, WHATSAPP_NUMBER_DISPLAY, WHATSAPP_URL } from './contact';
import { WhatsAppIcon } from './whatsapp-icon';

const HIGHLIGHTS = [
  'Aucune carte bancaire requise',
  'Vos données restent dans votre cabinet',
  'Mise en route le jour même',
];

export function CTASection() {
  return (
    <section className="px-8 py-32 flex justify-center relative">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(16,185,129,0.15) 0%, transparent 60%)',
        }}
      />
      <div className="relative z-10 max-w-3xl w-full rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent backdrop-blur-sm p-10 md:p-14 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[12px] font-medium mb-6">
          <Sparkles className="size-3.5" aria-hidden />
          Offre de lancement
        </div>
        <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight">
          {FREE_TRIAL_MONTHS} mois gratuits.{' '}
          <span className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">
            Sans engagement.
          </span>
        </h2>
        <p className="text-xl text-white/70 max-w-xl mt-6 mx-auto">
          Contactez-nous sur WhatsApp pour obtenir votre accès et installer
          Doctopus dans votre cabinet aujourd&apos;hui.
        </p>

        <ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-small text-white/80">
          {HIGHLIGHTS.map((h) => (
            <li key={h} className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-400" aria-hidden />
              {h}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-base font-semibold bg-emerald-500 text-white hover:bg-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_22px_56px_-18px_rgba(16,185,129,0.7)] transition-all"
          >
            <WhatsAppIcon className="size-5" />
            Démarrer sur WhatsApp
          </a>
          <Link
            href="/sign-in"
            className="px-7 py-4 rounded-lg text-base font-medium text-white border border-white/20 hover:bg-white/5 hover:border-white/40 transition-colors"
          >
            J&apos;ai déjà un compte
          </Link>
        </div>

        <p className="text-small text-white/50 mt-6 tabular-nums">
          {WHATSAPP_NUMBER_DISPLAY}
        </p>
      </div>
    </section>
  );
}
