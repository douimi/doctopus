import type { Metadata } from 'next';
import { Topbar } from '@/components/landing/topbar';
import { Hero } from '@/components/landing/hero';
import { OverviewSection } from '@/components/landing/overview-section';
import { ConsultationSection } from '@/components/landing/consultation-section';
import { OrdonnanceSection } from '@/components/landing/ordonnance-section';
import { PaymentsSection } from '@/components/landing/payments-section';
import { StatsSection } from '@/components/landing/stats-section';
import { AISection } from '@/components/landing/ai-section';
import { OfferSection } from '@/components/landing/offer-section';
import { FaqSection } from '@/components/landing/faq-section';
import { CTASection } from '@/components/landing/cta-section';
import { LandingFooter } from '@/components/landing/landing-footer';

const SITE_URL = 'https://www.mydoctopus.tech';
const TITLE = 'Doctopus · Logiciel de cabinet médical au Maroc';
const DESCRIPTION =
  'Dossier patient et antécédents, ordonnances avec le catalogue des médicaments au Maroc, salle d’attente, encaissements et statistiques. 3 mois gratuits, sans engagement.';

export const metadata: Metadata = {
  // Page-level metadataBase applies to this segment only (root layout untouched).
  metadataBase: new URL(SITE_URL),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  applicationName: 'Doctopus',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Doctopus',
    locale: 'fr_MA',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/brand-logo.png', width: 6250, height: 6250, alt: 'Doctopus' }],
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/brand-logo.png'],
  },
  robots: { index: true, follow: true },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Doctopus',
  url: SITE_URL,
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Logiciel de cabinet médical',
  operatingSystem: 'Web',
  inLanguage: 'fr',
  description: DESCRIPTION,
  areaServed: { '@type': 'Country', name: 'Maroc' },
};

export default function HomePage() {
  return (
    <div className="relative flex-1 bg-white text-slate-900 selection:bg-sky-200/70">
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped so it can't close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, '\\u003c') }}
      />
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
      >
        Aller au contenu
      </a>
      <Topbar />
      <main id="contenu">
        <Hero />
        <OverviewSection />
        <ConsultationSection />
        <OrdonnanceSection />
        <PaymentsSection />
        <StatsSection />
        <AISection />
        <OfferSection />
        <FaqSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
