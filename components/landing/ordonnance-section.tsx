'use client';

import { FeatureSection } from './feature-section';
import { OrdonnanceMockup } from './ordonnance-mockup';

export function OrdonnanceSection() {
  return (
    <FeatureSection
      id="ordonnance"
      muted
      reverse
      eyebrow="Ordonnance"
      title="Le catalogue des médicaments au Maroc, dans votre ordonnance."
      lead="Tapez quelques lettres du nom commercial ou de la DCI : Doctopus interroge le catalogue des médicaments commercialisés au Maroc et affiche le prix public et le statut de chaque spécialité."
      points={[
        {
          title: 'Prix public et statut.',
          body: 'Princeps ou générique, remboursable ou non : vous le voyez avant de prescrire.',
        },
        {
          title: 'Vos posologies habituelles.',
          body: 'Les posologies et durées que vous utilisez le plus vous sont proposées en un clic.',
        },
        {
          title: 'Ordonnance PDF à votre en-tête.',
          body: 'Logo, coordonnées du cabinet et INPE, avec votre signature et votre cachet. Prête à imprimer.',
        },
      ]}
      mockupLabel="Aperçu de la recherche de médicament : la saisie « doli » propose Doliprane 1 g et 500 mg, Dolicox et Doli pédiatrique, avec prix, statut princeps ou générique et remboursement."
      mockupPath="consultations/ordonnance"
      mockup={(revealed) => <OrdonnanceMockup revealed={revealed} />}
    />
  );
}
