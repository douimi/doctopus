import Link from 'next/link';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FollowUpSibling } from '@/lib/consultations/queries';
import { createFollowUpAction } from './actions';

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Cross-links between a consultation and its follow-up chain:
 * - if this row IS a follow-up, link back to the parent at the top
 * - list every direct child follow-up
 * - "Créer un suivi" button (only when the consultation is finalized;
 *   it doesn't make sense to follow up on a draft)
 */
export function FollowUpRelations({
  consultationId,
  parent,
  children,
  canCreate,
}: {
  consultationId: string;
  parent: FollowUpSibling | null;
  children: FollowUpSibling[];
  canCreate: boolean;
}) {
  if (!parent && children.length === 0 && !canCreate) return null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <RefreshCw className="size-4 text-muted-foreground shrink-0" aria-hidden />
          <h3 className="text-heading font-semibold leading-none">Suivi</h3>
        </div>
        {canCreate ? (
          <form action={createFollowUpAction}>
            <input type="hidden" name="parentId" value={consultationId} />
            <Button type="submit" size="sm" variant="secondary">
              <RefreshCw aria-hidden />
              Créer un suivi
            </Button>
          </form>
        ) : null}
      </div>

      {parent ? (
        <Link
          href={`/consultations/${parent.id}`}
          className="flex items-center gap-2 text-small text-muted-foreground hover:text-primary transition-colors"
          style={{ transitionDuration: 'var(--duration-fast)' }}
        >
          <ArrowUpRight className="size-3.5" aria-hidden />
          <span>
            Consultation parente du{' '}
            <span className="tabular-nums">{fmtDate(parent.consultedAt)}</span>
            {parent.motif ? ` · ${parent.motif}` : ''}
          </span>
        </Link>
      ) : null}

      {children.length > 0 ? (
        <ul className="space-y-1.5">
          {children.map((c) => (
            <li key={c.id}>
              <Link
                href={`/consultations/${c.id}`}
                className="flex items-center justify-between gap-2 text-small hover:text-primary transition-colors"
                style={{ transitionDuration: 'var(--duration-fast)' }}
              >
                <span className="truncate">
                  <span className="tabular-nums text-muted-foreground">
                    {fmtDate(c.consultedAt)}
                  </span>
                  <span className="ml-2">{c.motif ?? 'Suivi'}</span>
                </span>
                <span
                  className={
                    c.isFinalized
                      ? 'text-small text-success shrink-0'
                      : 'text-small text-warning shrink-0'
                  }
                >
                  {c.isFinalized ? 'Finalisé' : 'En cours'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
