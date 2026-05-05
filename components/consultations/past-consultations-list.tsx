import Link from 'next/link';
import { ChevronRight, FileText } from 'lucide-react';
import type { Consultation } from '@/db/schema';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';

function fmt(d: Date): string {
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function PastConsultationsList({ items }: { items: Consultation[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <EmptyState
          icon={FileText}
          title="Aucune consultation antérieure"
          description="Les consultations apparaîtront ici une fois finalisées."
        />
      </div>
    );
  }
  return (
    <ul
      role="list"
      className="divide-y divide-border rounded-xl border border-border bg-card shadow-card overflow-hidden"
    >
      {items.map((c) => (
        <li
          key={c.id}
          className="group/row flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
          style={{ transitionDuration: 'var(--duration-fast)' }}
        >
          <div className="font-mono text-small text-muted-foreground tabular-nums w-24 shrink-0">
            {fmt(c.consultedAt)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-body truncate">
              {c.diagnosis || (
                <span className="text-muted-foreground italic">Sans diagnostic</span>
              )}
            </div>
            <div className="text-small text-muted-foreground truncate">
              {c.motif ? c.motif.slice(0, 80) : 'Pas de motif renseigné'}
            </div>
          </div>
          <StatusBadge variant={c.isFinalized ? 'success' : 'warning'}>
            {c.isFinalized ? 'Terminée' : 'En cours'}
          </StatusBadge>
          <Link
            href={`/consultations/${c.id}`}
            className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            style={{ transitionDuration: 'var(--duration-fast)' }}
            aria-label="Ouvrir la consultation"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
