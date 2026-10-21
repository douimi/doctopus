import {
  CalendarClock,
  ClipboardList,
  LineChart,
  Pill,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionEyebrow } from './section-eyebrow';
import { container, focusRing, h2Class, leadClass } from './styles';

const FEATURES: Array<{ icon: LucideIcon; title: string; body: string; href: string }> = [
  {
    icon: ClipboardList,
    title: 'Dossier patient',
    body: 'Allergies et antécédents structurés, toujours visibles pendant la consultation.',
    href: '#consultation',
  },
  {
    icon: Pill,
    title: 'Ordonnances',
    body: 'Catalogue des médicaments au Maroc, prix public, PDF à votre en-tête.',
    href: '#ordonnance',
  },
  {
    icon: CalendarClock,
    title: 'Agenda du jour & salle d’attente',
    body: 'Rendez-vous, arrivées et temps d’attente, partagés avec l’accueil.',
    href: '#encaissements',
  },
  {
    icon: Wallet,
    title: 'Encaissements',
    body: 'Le médecin fixe le tarif, l’assistant(e) encaisse. Rien ne se perd.',
    href: '#encaissements',
  },
  {
    icon: LineChart,
    title: 'Statistiques',
    body: 'Chaque mois comparé au précédent, à date égale, et l’évolution sur 12 mois.',
    href: '#statistiques',
  },
  {
    icon: Sparkles,
    title: 'Assistant IA (option)',
    body: 'Un second avis qui connaît le dossier, sans jamais l’identité du patient.',
    href: '#assistant-ia',
  },
];

export function OverviewSection() {
  return (
    <section
      id="fonctionnalites"
      aria-labelledby="fonctionnalites-title"
      className="scroll-mt-20 border-y border-slate-200 bg-slate-50 py-16 sm:py-20"
    >
      <div className={container}>
        <div className="max-w-2xl">
          <SectionEyebrow>Fonctionnalités</SectionEyebrow>
          <h2 id="fonctionnalites-title" className={h2Class}>
            Tout le parcours du patient, de l&apos;accueil à l&apos;encaissement.
          </h2>
          <p className={cn(leadClass, 'mt-5')}>
            Doctopus remplace le registre, le carnet d&apos;ordonnances et le cahier de caisse.
            Le médecin et l&apos;assistant(e) travaillent sur les mêmes données, en temps réel.
          </p>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <a
                href={f.href}
                className={cn(
                  'group flex h-full gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300',
                  focusRing,
                )}
              >
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 group-hover:text-sky-700"
                >
                  <f.icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.body}</p>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
