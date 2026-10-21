'use client';

import { FeatureSection } from './feature-section';
import { PaymentsMockup } from './payments-mockup';

export function PaymentsSection() {
  return (
    <FeatureSection
      id="encaissements"
      eyebrow="Salle d’attente & encaissements"
      title="Du diagnostic au paiement, sans papier ni oubli."
      lead="Le médecin clôture la consultation avec son tarif, l’assistant(e) encaisse depuis l’accueil. Chacun voit ce qu’il doit voir, et aucun paiement ne se perd entre deux patients."
      points={[
        {
          title: 'Agenda du jour et salle d’attente.',
          body: 'Rendez-vous, patients sans rendez-vous et temps d’attente, partagés entre l’accueil et le cabinet.',
        },
        {
          title: 'Tarif fixé à la clôture.',
          body: 'Prix par défaut du cabinet, ou gratuit : la case est cochée d’office pour un suivi.',
        },
        {
          title: 'Encaissement en un geste.',
          body: 'Espèces, carte, chèque, virement ou autre, avec une note si besoin.',
        },
        {
          title: 'Rôles séparés.',
          body: 'L’assistant(e) gère l’accueil et la caisse ; le contenu des consultations reste réservé au médecin.',
        },
      ]}
      mockupLabel="Aperçu de la clôture par le médecin (prix 250 MAD, case Gratuit) et de l’encaissement par l’assistante (méthode Espèces sélectionnée)."
      mockupPath="today"
      mockup={() => <PaymentsMockup />}
    />
  );
}
