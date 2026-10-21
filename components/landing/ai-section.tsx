'use client';

import Link from 'next/link';
import { FeatureSection } from './feature-section';
import { AIMockup } from './ai-mockup';
import { focusRing } from './styles';

export function AISection() {
  return (
    <FeatureSection
      id="assistant-ia"
      eyebrow="Assistant clinique IA · en option"
      title="Un second avis rapide, qui a lu le dossier."
      lead="Posez votre question en français pendant la consultation. L’assistant connaît le motif, les constantes, les allergies, les antécédents et les dernières ordonnances du patient."
      points={[
        {
          title: 'Identité jamais transmise.',
          body: 'Le nom, le CIN, le téléphone et l’adresse du patient ne sont jamais envoyés.',
        },
        {
          title: 'Médicaments vérifiés.',
          body: 'Pour les prix et la disponibilité, il interroge le catalogue des médicaments au Maroc au lieu d’inventer.',
        },
        {
          title: 'Une aide, pas un diagnostic.',
          body: 'Il propose des pistes ; le jugement clinique reste le vôtre.',
        },
      ]}
      aside={
        <p className="text-sm leading-relaxed text-slate-600">
          L’assistant s’active à la demande pour votre cabinet. Il s’appuie sur des fournisseurs
          d’IA tiers, listés sur notre page{' '}
          <Link
            href="/static/sous-traitants"
            className={`rounded-sm font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800 ${focusRing}`}
          >
            sous-traitants
          </Link>
          .
        </p>
      }
      mockupLabel="Aperçu de l’assistant clinique : à la question « Je peux lui prescrire de l’amoxicilline ? », il rappelle l’allergie à la pénicilline inscrite au dossier et propose un traitement symptomatique."
      mockupPath="consultations/assistant"
      mockup={(revealed) => <AIMockup revealed={revealed} />}
    />
  );
}
