import Link from 'next/link';
import type { FollowUpSibling } from '@/lib/consultations/queries';

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Direct follow-ups of this consultation, shown in the context rail.
 * The parent link lives in the header ("Suivi du …"), and "Créer un
 * suivi" in the header's overflow menu.
 */
export function FollowUpRelations({ items }: { items: FollowUpSibling[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="rail-followups" className="panel p-4 space-y-2">
      <h2 id="rail-followups" className="eyebrow">
        Suivis de cette consultation ({items.length})
      </h2>
      <ul className="space-y-1.5">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              href={`/consultations/${c.id}`}
              className="flex items-center justify-between gap-2 rounded-sm text-small hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="min-w-0 truncate">
                <span className="tabular-nums text-muted-foreground">{fmtDate(c.consultedAt)}</span>
                <span className="ml-2">{c.motif ?? 'Suivi'}</span>
              </span>
              <span
                className={
                  c.isFinalized
                    ? 'shrink-0 text-small text-success-ink'
                    : 'shrink-0 text-small text-warning-ink'
                }
              >
                {c.isFinalized ? 'Clôturée' : 'En cours'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
