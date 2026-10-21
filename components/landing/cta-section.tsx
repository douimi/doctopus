import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FREE_TRIAL_MONTHS } from './contact';
import { WhatsAppLink } from './whatsapp-link';
import { btnPrimaryLg, container, focusRing } from './styles';

export function CTASection() {
  return (
    <section aria-labelledby="cta-title" className="py-16 sm:py-20 lg:py-24">
      <div className={container}>
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-6 py-12 text-center sm:px-12 sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgb(56_189_248/0.22),transparent_70%)]"
          />
          <div className="relative">
            <h2
              id="cta-title"
              className="mx-auto max-w-2xl text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-white text-balance sm:text-4xl"
            >
              Prêt à simplifier votre cabinet ?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {FREE_TRIAL_MONTHS} mois gratuits, sans engagement. Écrivez-nous : nous mettons votre
              cabinet en place avec vous.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <WhatsAppLink
                className={cn(btnPrimaryLg, 'w-full sm:w-auto focus-visible:ring-offset-slate-900')}
                iconClassName="size-5"
              >
                Démarrer sur WhatsApp
              </WhatsAppLink>
              <Link
                href="/sign-in"
                className={cn(
                  'inline-flex h-12 w-full items-center justify-center rounded-lg border border-white/25 px-6 text-base font-medium text-white transition-colors hover:bg-white/10 sm:w-auto',
                  focusRing,
                  'focus-visible:ring-sky-400 focus-visible:ring-offset-slate-900',
                )}
              >
                J&apos;ai déjà un compte
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
