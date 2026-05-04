import Link from 'next/link';
import type { Consultation } from '@/db/schema';
import { StatusBadge } from '@/components/ui/status-badge';

function fmt(d: Date): string {
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function PastConsultationsList({ items }: { items: Consultation[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune consultation antérieure.</p>;
  }
  return (
    <ul className="divide-y border border-border rounded-md">
      {items.map((c) => (
        <li key={c.id} className="p-3 flex items-center gap-3 text-sm">
          <div className="font-mono w-24">{fmt(c.consultedAt)}</div>
          <div className="flex-1">
            <div className="font-medium">{c.diagnosis ? c.diagnosis : '— sans diagnostic —'}</div>
            <div className="text-xs text-muted-foreground">
              {c.motif ? c.motif.slice(0, 80) : 'Pas de motif renseigné'}
            </div>
          </div>
          <StatusBadge variant={c.isFinalized ? 'success' : 'neutral'}>
            {c.isFinalized ? 'terminée' : 'en cours'}
          </StatusBadge>
          <Link href={`/consultations/${c.id}`} className="text-xs underline">
            ouvrir
          </Link>
        </li>
      ))}
    </ul>
  );
}
