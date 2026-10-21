'use client';

import { FeatureSection } from './feature-section';
import { StatsMockup } from './stats-mockup';

export function StatsSection() {
  return (
    <FeatureSection
      id="statistiques"
      muted
      reverse
      eyebrow="Statistiques"
      title="Ce mois-ci, mieux ou moins bien que le mois dernier ?"
      lead="Chaque indicateur est comparé au mois précédent, à date égale : au 21 octobre, Doctopus compare avec le 1er–21 septembre, pas avec le mois entier. Vous savez tout de suite où vous en êtes."
      points={[
        {
          title: 'Un écart sur chaque indicateur.',
          body: 'Recettes, consultations, prix moyen et paiements en attente, en % par rapport au mois choisi.',
        },
        {
          title: 'Recettes cumulées.',
          body: 'La courbe du mois en cours superposée à celle du mois de comparaison, jour par jour.',
        },
        {
          title: 'Évolution sur 12 mois.',
          body: 'Graphique et tableau mois par mois pour repérer les saisons creuses et les pics.',
        },
        {
          title: 'Et le détail.',
          body: 'Recettes par jour et par méthode de paiement, paiements en attente, patients les plus fidèles.',
        },
      ]}
      mockupLabel="Aperçu des statistiques d’octobre comparées à septembre : recettes 37 450 MAD en hausse de 12 %, consultations +8 %, prix moyen +4 %, paiements en attente −29 %, courbe des recettes cumulées et évolution sur 12 mois."
      mockupPath="stats"
      mockup={(revealed) => <StatsMockup revealed={revealed} />}
    />
  );
}
