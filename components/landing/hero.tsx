import { ArrowDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FREE_TRIAL_MONTHS } from './contact';
import { MockupFrame } from './mockup-frame';
import { TodayMockup } from './today-mockup';
import { WhatsAppLink } from './whatsapp-link';
import { btnPrimaryLg, btnSecondaryLg, container } from './styles';

const REASSURANCE = [
  'Sans engagement',
  'Sans carte bancaire',
  'Reprise de vos données par notre équipe',
  'Rien à installer',
];

/**
 * Server component: the h1 (the LCP element) is in the initial HTML and
 * painted without waiting for JS or an entrance animation.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* Landing-only mesh, scoped to the hero (no fixed attachment: that
          forces a full repaint on every scroll frame on mobile). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(ellipse_60%_55%_at_15%_0%,rgb(56_189_248/0.16),transparent_70%),radial-gradient(ellipse_50%_45%_at_85%_5%,rgb(129_140_248/0.13),transparent_70%)]"
      />
      <div
        className={cn(
          container,
          'relative grid items-center gap-12 pb-16 pt-10 sm:pt-16 lg:grid-cols-2 lg:gap-12 lg:pb-24 lg:pt-20',
        )}
      >
        <div className="min-w-0">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[13px] font-medium text-slate-700">
            <span aria-hidden className="size-1.5 rounded-full bg-emerald-600" />
            Logiciel médical conçu pour le Maroc
          </p>
          <h1
            id="hero-title"
            className="text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.025em] text-slate-900 text-balance sm:text-5xl lg:text-[3.5rem]"
          >
            Votre cabinet médical,{' '}
            <span className="bg-gradient-to-br from-sky-700 via-indigo-600 to-fuchsia-700 bg-clip-text text-transparent">
              simplifié.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 text-pretty">
            Dossier patient et antécédents, ordonnances avec le catalogue des médicaments au Maroc,
            salle d&apos;attente, encaissements et statistiques. Un seul outil, en français, pour
            le médecin et son assistant(e).
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <WhatsAppLink className={btnPrimaryLg} iconClassName="size-5">
              Essayer {FREE_TRIAL_MONTHS} mois gratuits
            </WhatsAppLink>
            <a href="#fonctionnalites" className={btnSecondaryLg}>
              Découvrir les fonctionnalités
              <ArrowDown className="size-4" aria-hidden />
            </a>
          </div>

          <ul className="mt-7 grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-slate-600 sm:grid-cols-2">
            {REASSURANCE.map((r) => (
              <li key={r} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-emerald-700" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          <MockupFrame
            path="today"
            label="Aperçu de l’écran Aujourd’hui de Doctopus : indicateurs du jour, salle d’attente avec temps d’attente et bouton Commencer, paiements à encaisser."
          >
            <TodayMockup />
          </MockupFrame>
        </div>
      </div>
    </section>
  );
}
