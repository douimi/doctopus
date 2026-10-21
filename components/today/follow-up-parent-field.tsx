'use client';

import { useEffect, useId, useState } from 'react';
import type { FollowUpParentCandidate } from '@/lib/consultations/queries';
import { listFollowUpParentCandidatesAction } from '@/app/(authenticated)/today/book/actions';
import { fieldClasses } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * "C'est un suivi" checkbox + parent consultation select, shared by the
 * booking and walk-in forms. The patient's consultations are fetched the
 * first time the box is ticked. Renders the hidden `parentConsultationId`
 * input itself and reports whether the form may be submitted.
 */
export function FollowUpParentField({
  patientId,
  defaultChecked = false,
  onBlockingChange,
}: {
  patientId: string;
  defaultChecked?: boolean;
  /** true while the follow-up choice is incomplete (loading, no parent available). */
  onBlockingChange?: (blocking: boolean) => void;
}) {
  const id = useId();
  const [checked, setChecked] = useState(defaultChecked);
  const [parents, setParents] = useState<FollowUpParentCandidate[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [parentId, setParentId] = useState('');

  useEffect(() => {
    if (!checked || parents !== null) return;
    let alive = true;
    listFollowUpParentCandidatesAction(patientId)
      .then((rows) => {
        if (!alive) return;
        setParents(rows);
        setParentId((cur) => cur || rows[0]?.id || '');
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [checked, parents, patientId]);

  const loading = checked && parents === null && !failed;
  const none = checked && parents !== null && parents.length === 0;
  const blocking = checked && (loading || none || failed || !parentId);

  useEffect(() => {
    onBlockingChange?.(blocking);
  }, [blocking, onBlockingChange]);

  return (
    <div className="space-y-2">
      <input type="hidden" name="parentConsultationId" value={checked ? parentId : ''} />
      <label className="flex cursor-pointer items-start gap-2.5 text-body">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
        />
        <span>
          <span className="font-medium">C&apos;est un suivi</span>
          <span className="block text-small text-muted-foreground">
            Gratuit par défaut ; motif, histoire, examen et constantes repris de la
            consultation choisie.
          </span>
        </span>
      </label>
      {checked ? (
        <div className="ml-6.5 space-y-1.5">
          {loading ? (
            <p className="text-small text-muted-foreground">
              Chargement des consultations précédentes…
            </p>
          ) : failed ? (
            <p className="text-small text-danger-ink">
              Impossible de charger les consultations. Réessayez.
            </p>
          ) : none ? (
            <p className="text-small text-warning-ink">
              Aucune consultation précédente pour ce patient : un suivi doit être rattaché à
              une consultation existante.
            </p>
          ) : (
            <>
              <Label htmlFor={`${id}-parent`}>Consultation parente</Label>
              <select
                id={`${id}-parent`}
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className={cn(fieldClasses, 'h-9')}
              >
                {(parents ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {fmtDate(c.consultedAt)}
                    {c.isFollowUp ? ' · Suivi' : ''}
                    {c.isFinalized ? '' : ' · En cours'}
                    {' — '}
                    {c.motif ?? 'Motif non renseigné'}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
