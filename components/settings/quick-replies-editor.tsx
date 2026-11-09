'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { showToast } from '@/components/ui/toast';
import { saveQuickRepliesAction } from '@/app/(authenticated)/settings/cabinet/quick-replies-actions';
import { QUICK_REPLIES_CHANGED_EVENT } from '@/components/messaging/constants';

type Row = { key: string; label: string; body: string };

const MAX = 20;

/**
 * Doctor-only editor for the messaging one-tap replies ("Patient suivant",
 * "Appelez-moi"…). Shown as chips above every composer, for the whole team.
 */
export function QuickRepliesEditor({ initial }: { initial: Array<{ label: string; body: string }> }) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((r) => ({ key: crypto.randomUUID(), label: r.label, body: r.body })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(key: string, change: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...change } : r)));
  }

  function move(index: number, delta: -1 | 1) {
    setRows((rs) => {
      const next = [...rs];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item!);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await saveQuickRepliesAction(
      rows
        .map((r) => ({ label: r.label.trim(), body: r.body.trim() }))
        .filter((r) => r.label || r.body),
    ).catch(() => ({ ok: false as const, error: 'Enregistrement impossible.' }));
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    window.dispatchEvent(new Event(QUICK_REPLIES_CHANGED_EVENT));
    showToast({ title: 'Messages rapides enregistrés', variant: 'success' });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="size-4 text-primary" aria-hidden />
          Messages rapides
        </CardTitle>
        <CardDescription>
          Boutons en un clic au-dessus de la zone de saisie de la messagerie, pour toute l’équipe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-small text-muted-foreground">Aucun message rapide.</p>
        ) : null}
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.key} className="flex flex-col gap-2 rounded-lg border border-border p-2.5 sm:flex-row sm:items-center">
              <Input
                value={r.label}
                onChange={(e) => patch(r.key, { label: e.target.value })}
                maxLength={32}
                placeholder="Libellé du bouton"
                aria-label={`Libellé ${i + 1}`}
                className="sm:w-44"
              />
              <Input
                value={r.body}
                onChange={(e) => patch(r.key, { body: e.target.value })}
                maxLength={280}
                placeholder="Message envoyé"
                aria-label={`Message ${i + 1}`}
                className="flex-1"
              />
              <div className="flex shrink-0 items-center gap-0.5 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Monter"
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Descendre"
                >
                  <ArrowDown aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  aria-label="Supprimer"
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ol>
        {error ? <p className="text-small text-danger-ink">{error}</p> : null}
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={rows.length >= MAX}
          onClick={() => setRows((rs) => [...rs, { key: crypto.randomUUID(), label: '', body: '' }])}
        >
          <Plus aria-hidden />
          Ajouter
        </Button>
        <Button type="button" onClick={() => void save()} loading={saving}>
          Enregistrer
        </Button>
      </CardFooter>
    </Card>
  );
}
