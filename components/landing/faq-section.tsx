import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FREE_TRIAL_MONTHS } from './contact';
import { SectionEyebrow } from './section-eyebrow';
import { container, focusRing, h2Class } from './styles';

const linkClass = cn(
  'rounded-sm font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800',
  focusRing,
);

/**
 * Native <details>/<summary>: keyboard and screen-reader accessible,
 * works without JS, zero runtime cost. Answers only state what the
 * product does today.
 */
const FAQ: Array<{ q: string; a: ReactNode }> = [
  {
    q: 'Faut-il installer un logiciel ?',
    a: 'Non. Doctopus fonctionne dans le navigateur, sur ordinateur, tablette ou téléphone. Il n’y a rien à installer et les mises à jour sont automatiques.',
  },
  {
    q: 'Mon assistant(e) peut-il utiliser Doctopus ?',
    a: 'Oui. Chaque membre de l’équipe a son propre compte. L’assistant(e) gère l’agenda du jour, la salle d’attente et les encaissements ; le contenu des consultations reste réservé au médecin.',
  },
  {
    q: 'Mes données patients sont-elles protégées ?',
    a: 'Chaque cabinet est cloisonné : vos données ne sont accessibles qu’à votre équipe. Les actions sensibles, comme l’impression d’une ordonnance, sont tracées dans un journal d’audit consultable par le médecin.',
  },
  {
    q: 'Que transmet l’assistant IA ?',
    a: (
      <>
        Uniquement le contexte clinique de la consultation (âge, sexe, motif, constantes,
        allergies, antécédents, ordonnances récentes), jamais le nom, le CIN, le téléphone ni
        l&apos;adresse du patient. L&apos;assistant est optionnel et les fournisseurs utilisés
        sont listés sur la page{' '}
        <Link href="/static/sous-traitants" className={linkClass}>
          sous-traitants
        </Link>
        .
      </>
    ),
  },
  {
    q: 'Puis-je reprendre les données de mon ancien logiciel ?',
    a: 'Oui. Envoyez-nous votre fichier (Excel, CSV ou export de votre logiciel actuel). Notre équipe le vérifie avec vous avant d’importer vos patients.',
  },
  {
    q: `Que se passe-t-il après les ${FREE_TRIAL_MONTHS} mois ?`,
    a: 'L’essai est sans engagement. Avant la fin, nous faisons le point avec vous sur WhatsApp ; vous restez libre de continuer ou d’arrêter.',
  },
];

export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="scroll-mt-20 border-t border-slate-200 bg-slate-50 py-16 sm:py-20 lg:py-24"
    >
      <div className={cn(container, 'grid gap-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16')}>
        <div>
          <SectionEyebrow>Questions fréquentes</SectionEyebrow>
          <h2 id="faq-title" className={h2Class}>
            Ce que les médecins nous demandent.
          </h2>
        </div>
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {FAQ.map((item) => (
            <details key={item.q} className="group">
              <summary
                className={cn(
                  'flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 text-left text-[15px] font-semibold text-slate-900 [&::-webkit-details-marker]:hidden',
                  focusRing,
                )}
              >
                {item.q}
                <ChevronDown
                  aria-hidden
                  className="size-4 shrink-0 text-slate-500 transition-transform duration-150 group-open:rotate-180"
                />
              </summary>
              <div className="px-5 pb-5 text-[15px] leading-relaxed text-slate-600">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
