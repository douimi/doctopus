import type { Metadata } from 'next';
import { Topbar } from '@/components/landing/topbar';
import { ScrollProgress } from '@/components/landing/scroll-progress';
import { Hero } from '@/components/landing/hero';
import { ConsultationSection } from '@/components/landing/consultation-section';
import { OrdonnanceSection } from '@/components/landing/ordonnance-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { StatsSection } from '@/components/landing/stats-section';
import { AISection } from '@/components/landing/ai-section';
import { MigrationSection } from '@/components/landing/migration-section';
import { CTASection } from '@/components/landing/cta-section';
import { LandingFooter } from '@/components/landing/landing-footer';

export const metadata: Metadata = {
  title: 'Doctopus — Logiciel de cabinet médical pour le Maroc',
  description:
    'Consultations, ordonnances, paiements et statistiques dans une seule interface conçue pour les médecins du Maroc. Sur invitation pendant la phase pilote.',
};

export default function HomePage() {
  return (
    <div className="bg-black text-white selection:bg-sky-500/30">
      <ScrollProgress />
      <Topbar />
      <Hero />
      <ConsultationSection />
      <OrdonnanceSection />
      <PricingSection />
      <StatsSection />
      <AISection />
      <MigrationSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
