import Link from 'next/link';
import type { Consultation } from '@/db/schema';

function fmt(d: Date): string {
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function PastConsultationsList({ items }: { items: Consultation[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Aucune consultation antérieure.</p>;
  }
  return (
    <ul className="divide-y border rounded-md">
      {items.map((c) => (
        <li key={c.id} className="p-3 flex items-center gap-3 text-sm">
          <div className="font-mono w-24">{fmt(c.consultedAt)}</div>
          <div className="flex-1">
            <div className="font-medium">{c.diagnosis ? c.diagnosis : '— sans diagnostic —'}</div>
            <div className="text-xs text-gray-600">
              {c.motif ? c.motif.slice(0, 80) : 'Pas de motif renseigné'}
            </div>
          </div>
          <span className="text-xs rounded bg-gray-100 px-2 py-1">
            {c.isFinalized ? 'terminée' : 'en cours'}
          </span>
          <Link href={`/consultations/${c.id}`} className="text-xs underline">
            ouvrir
          </Link>
        </li>
      ))}
    </ul>
  );
}
