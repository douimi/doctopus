'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type HistoryListEntry = {
  id: string;
  consultedAt: Date;
  motif: string | null;
  diagnosis: string | null;
  isFinalized: boolean;
  isFollowUp: boolean;
  /** "Parent" / "Suivi de cette consultation" relation to the current one. */
  relation: 'parent' | 'child' | null;
  vitalsLine: string | null;
  rx: Array<{ label: string; posologie: string | null; duration: string | null }>;
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * The patient's other consultations, inline in the cockpit. Each row
 * expands to diagnosis + prescription + vitals so the doctor never has
 * to leave the visit to check what was given last time.
 */
export function ConsultationHistoryList({
  entries,
  total,
  patientId,
}: {
  entries: HistoryListEntry[];
  total: number;
  patientId: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section aria-labelledby="rail-history" className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h2 id="rail-history" className="eyebrow">
          Historique{total > 0 ? ` (${total})` : ''}
        </h2>
        {total > entries.length ? (
          <Link
            href={`/patients/${patientId}`}
            className="text-small font-medium text-primary hover:underline"
          >
            Tout voir
          </Link>
        ) : null}
      </div>
      {entries.length === 0 ? (
        <p className="px-4 pb-4 text-small text-muted-foreground">
          Première consultation de ce patient.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {entries.map((e) => {
            const open = openId === e.id;
            const title = e.diagnosis || e.motif || 'Sans diagnostic';
            return (
              <li key={e.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`hist-${e.id}`}
                  onClick={() => setOpenId(open ? null : e.id)}
                  className="flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <ChevronRight
                    className={cn(
                      'mt-0.5 size-4 shrink-0 text-subtle-foreground transition-transform',
                      open && 'rotate-90',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="text-small font-medium tabular-nums text-muted-foreground">
                        {fmtDate(e.consultedAt)}
                      </span>
                      {e.relation === 'parent' ? (
                        <span className="text-micro font-semibold uppercase text-primary-ink">
                          Consultation initiale
                        </span>
                      ) : e.relation === 'child' ? (
                        <span className="text-micro font-semibold uppercase text-primary-ink">
                          Suivi
                        </span>
                      ) : e.isFollowUp ? (
                        <span className="text-micro font-semibold uppercase text-muted-foreground">
                          Suivi
                        </span>
                      ) : null}
                      {!e.isFinalized ? (
                        <span className="text-micro font-semibold uppercase text-warning-ink">
                          En cours
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        'block text-body',
                        open ? 'whitespace-pre-wrap' : 'truncate',
                        !e.diagnosis && !e.motif && 'italic text-muted-foreground',
                      )}
                    >
                      {title}
                    </span>
                    {!open && e.rx.length > 0 ? (
                      <span className="block truncate text-small text-muted-foreground">
                        {e.rx.length} médicament{e.rx.length > 1 ? 's' : ''} ·{' '}
                        {e.rx.map((r) => r.label).join(', ')}
                      </span>
                    ) : null}
                  </span>
                </button>
                {open ? (
                  <div id={`hist-${e.id}`} className="space-y-2 px-4 pb-3 pl-10 text-small">
                    {e.diagnosis && e.motif ? (
                      <p>
                        <span className="text-muted-foreground">Motif : </span>
                        {e.motif}
                      </p>
                    ) : null}
                    {e.vitalsLine ? (
                      <p className="tabular-nums">
                        <span className="text-muted-foreground">Constantes : </span>
                        {e.vitalsLine}
                      </p>
                    ) : null}
                    {e.rx.length > 0 ? (
                      <div>
                        <p className="text-muted-foreground">Ordonnance :</p>
                        <ol className="mt-0.5 list-decimal space-y-0.5 pl-4">
                          {e.rx.map((r, i) => (
                            <li key={i}>
                              <span className="font-medium">{r.label}</span>
                              {r.posologie ? ` · ${r.posologie}` : ''}
                              {r.duration ? ` · ${r.duration}` : ''}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Pas d&apos;ordonnance.</p>
                    )}
                    <Link
                      href={`/consultations/${e.id}`}
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      Ouvrir
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
