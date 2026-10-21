import { Check, Database, MessageCircle, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FREE_TRIAL_MONTHS, WHATSAPP_NUMBER_DISPLAY } from './contact';
import { SectionEyebrow } from './section-eyebrow';
import { WhatsAppLink } from './whatsapp-link';
import { btnPrimaryLg, container, h2Class, leadClass } from './styles';

const INCLUDED = [
  'Toutes les fonctionnalités, sans restriction',
  'Comptes médecin et assistant(e)',
  'Reprise de vos patients depuis votre ancien fichier',
  'Mise en place et accompagnement sur WhatsApp',
];

const STEPS = [
  {
    icon: MessageCircle,
    title: 'Écrivez-nous sur WhatsApp',
    body: 'Nous créons l’accès de votre cabinet et vous aidons à le configurer : en-tête d’ordonnance, tarif par défaut, comptes de l’équipe.',
  },
  {
    icon: Database,
    title: 'Nous reprenons vos données',
    body: 'Excel, CSV ou export de votre logiciel actuel : notre équipe vérifie le fichier avec vous, puis importe vos patients.',
  },
  {
    icon: Stethoscope,
    title: 'Vous consultez',
    body: 'Vous continuez à recevoir vos patients pendant la reprise. Rien à installer : un navigateur suffit.',
  },
];

/** Launch offer + how onboarding works (formerly the "Reprise de données" section). */
export function OfferSection() {
  return (
    <section id="offre" aria-labelledby="offre-title" className="scroll-mt-20 py-16 sm:py-20 lg:py-28">
      <div className={cn(container, 'grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16')}>
        <div className="min-w-0">
          <SectionEyebrow>Offre de lancement</SectionEyebrow>
          <h2 id="offre-title" className={h2Class}>
            {FREE_TRIAL_MONTHS} mois gratuits pour essayer Doctopus dans votre cabinet.
          </h2>
          <p className={cn(leadClass, 'mt-5')}>
            Doctopus est en phase pilote : l&apos;accès se fait sur invitation, directement avec
            notre équipe. Pas de formulaire, pas de carte bancaire.
          </p>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-7">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">
                0 MAD
              </span>
              <span className="text-sm text-slate-600">
                pendant {FREE_TRIAL_MONTHS} mois · sans engagement
              </span>
            </div>
            <ul className="mt-6 space-y-3">
              {INCLUDED.map((i) => (
                <li key={i} className="flex gap-3 text-[15px] text-slate-700">
                  <Check className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />
                  {i}
                </li>
              ))}
            </ul>
            <WhatsAppLink className={cn(btnPrimaryLg, 'mt-7 w-full')} iconClassName="size-5">
              Demander mon accès
            </WhatsAppLink>
            <p className="mt-3 text-center text-sm text-slate-600">
              WhatsApp : <span className="tabular-nums font-medium text-slate-800">{WHATSAPP_NUMBER_DISPLAY}</span>
            </p>
          </div>
        </div>

        <div className="min-w-0 lg:pt-12">
          <h3 className="text-xl font-semibold text-slate-900">Comment démarrer</h3>
          <ol className="mt-6 space-y-4">
            {STEPS.map((s, idx) => (
              <li key={s.title} className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
                >
                  <s.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 tabular-nums">
                    Étape {idx + 1}
                  </p>
                  <h4 className="mt-0.5 text-base font-semibold text-slate-900">{s.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
