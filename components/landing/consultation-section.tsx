'use client';

import { FeatureSection } from './feature-section';
import { ConsultationMockup } from './consultation-mockup';

export function ConsultationSection() {
  return (
    <FeatureSection
      id="consultation"
      eyebrow="Dossier & consultation"
      title="Les antécédents sous les yeux, pendant toute la consultation."
      lead="Allergies, pathologies chroniques et antécédents structurés restent affichés à côté de votre saisie. Plus besoin de fouiller le dossier pendant que le patient attend."
      points={[
        {
          title: 'Allergies et pathologies en tête.',
          body: 'Une allergie documentée est signalée en rouge à chaque consultation, avant que vous ne prescriviez.',
        },
        {
          title: 'Antécédents structurés.',
          body: 'Médicaux, chirurgicaux, familiaux, traitements en cours et habitudes de vie, tenus à jour au niveau du patient.',
        },
        {
          title: 'Une consultation complète sur un écran.',
          body: 'Motif, constantes, histoire de la maladie, examen clinique, diagnostic, ordonnance et suite à donner, enregistrés automatiquement pendant la saisie.',
        },
        {
          title: 'Suivis reliés.',
          body: 'Un contrôle se rattache à sa consultation d’origine ; l’historique du patient reste à portée de clic.',
        },
      ]}
      mockupLabel="Aperçu de l’écran de consultation : antécédents structurés et allergie à la pénicilline affichés à gauche ; motif, constantes, diagnostic et ordonnance à droite."
      mockupPath="consultations"
      mockup={(revealed) => <ConsultationMockup revealed={revealed} />}
    />
  );
}
