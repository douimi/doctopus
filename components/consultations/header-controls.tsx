'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu } from '@base-ui/react/menu';
import { Tooltip } from '@base-ui/react/tooltip';
import {
  ChevronLeft,
  ClipboardList,
  FolderOpen,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DeleteConsultationDialog } from '@/app/(authenticated)/consultations/[id]/delete-dialog';
import { createFollowUpAction } from '@/app/(authenticated)/consultations/[id]/actions';
import { useCockpit } from './cockpit-context';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Goes back to wherever the doctor came from (patient file, list,
 * /suivis…) when that's inside the app; falls back to /today for a
 * direct hit or an external referrer. A real link, so middle-click and
 * "open in new tab" still work.
 */
export function BackLink() {
  const router = useRouter();
  return (
    <Link
      href="/today"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        let sameOrigin = false;
        try {
          sameOrigin =
            document.referrer !== '' &&
            new URL(document.referrer).origin === window.location.origin;
        } catch {
          sameOrigin = false;
        }
        if (sameOrigin && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground',
        FOCUS,
      )}
      aria-label="Retour"
      title="Retour"
    >
      <ChevronLeft className="size-5" aria-hidden />
    </Link>
  );
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** "Enregistré · 10:42" / "Enregistrement…" / error, driven by the editor. */
export function SaveIndicator({
  className,
  idleLabel = 'Brouillon enregistré',
}: {
  className?: string;
  /** Shown before the first edit of this visit. */
  idleLabel?: string;
}) {
  const { saveState } = useCockpit();
  let label: string;
  let dot: string;
  let tone = 'text-muted-foreground';
  switch (saveState.status) {
    case 'saving':
      label = 'Enregistrement…';
      dot = 'bg-warning animate-pulse';
      break;
    case 'dirty':
      label = 'Modifications non enregistrées';
      dot = 'bg-warning';
      break;
    case 'saved':
      label = `Enregistré · ${fmtTime(saveState.at)}`;
      dot = 'bg-success';
      break;
    case 'error':
      label = `Non enregistré — ${saveState.error}`;
      dot = 'bg-danger';
      tone = 'text-danger-ink';
      break;
    default:
      label = idleLabel;
      dot = 'bg-subtle-foreground';
  }
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5 text-small tabular-nums',
        tone,
        className,
      )}
      title={label}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', dot)} />
      <span className="truncate">{label}</span>
    </span>
  );
}

/**
 * AI drawer toggle. When the assistant can't be used (disabled, no key,
 * no credits) it's a disabled-looking icon whose tooltip says why —
 * no card, no column.
 */
export function AiToggle({ unavailableReason }: { unavailableReason: string | null }) {
  const { aiOpen, setAiOpen } = useCockpit();
  if (unavailableReason) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger
          aria-disabled="true"
          aria-label={`Assistant IA indisponible : ${unavailableReason}`}
          className={cn(
            'inline-flex size-9 shrink-0 cursor-not-allowed items-center justify-center rounded-lg text-subtle-foreground opacity-60',
            FOCUS,
          )}
          onClick={(e) => e.preventDefault()}
        >
          <Sparkles className="size-4" aria-hidden />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={6} className="z-50">
            <Tooltip.Popup className="max-w-64 rounded-md bg-foreground px-2.5 py-1.5 text-small text-background shadow-popover">
              Assistant IA indisponible : {unavailableReason}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  }
  return (
    <Button
      type="button"
      variant={aiOpen ? 'secondary' : 'ghost'}
      size="icon"
      aria-pressed={aiOpen}
      aria-label={aiOpen ? "Masquer l'assistant IA" : "Afficher l'assistant IA"}
      title="Assistant IA"
      onClick={() => setAiOpen(!aiOpen)}
      className={cn(aiOpen && 'text-primary')}
    >
      <Sparkles aria-hidden />
    </Button>
  );
}

/**
 * Below lg the patient context rail becomes a sheet. This trigger sits
 * in the sticky header and always shows a one-line antécédents summary,
 * so the record stays visible without opening anything.
 */
export function ContextSheetTrigger({
  summary,
  historyCount,
}: {
  summary: string | null;
  historyCount: number;
}) {
  const { contextOpen, setContextOpen } = useCockpit();
  return (
    <button
      type="button"
      onClick={() => setContextOpen(!contextOpen)}
      aria-expanded={contextOpen}
      aria-controls="patient-context-rail"
      className={cn(
        'flex w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-1.5 text-left text-small hover:bg-muted lg:hidden',
        FOCUS,
      )}
    >
      <ClipboardList className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium text-foreground">Antécédents : </span>
        <span className={summary ? 'text-foreground' : 'text-muted-foreground italic'}>
          {summary ?? 'aucun renseigné'}
        </span>
      </span>
      <span className="shrink-0 font-medium text-primary">
        Dossier{historyCount > 0 ? ` · ${historyCount} visite${historyCount > 1 ? 's' : ''}` : ''}
      </span>
    </button>
  );
}

const menuItemClass =
  'flex h-9 cursor-default select-none items-center gap-2 rounded-md px-2.5 text-body text-foreground outline-none data-highlighted:bg-muted';

export function HeaderOverflowMenu({
  consultationId,
  patientId,
  patientFullName,
  isPaid,
  canCreateFollowUp,
}: {
  consultationId: string;
  patientId: string;
  patientFullName: string;
  isPaid: boolean;
  canCreateFollowUp: boolean;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [creating, startCreating] = useTransition();

  function createFollowUp() {
    const fd = new FormData();
    fd.set('parentId', consultationId);
    startCreating(async () => {
      await createFollowUpAction(fd);
    });
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Plus d'actions"
              title="Plus d'actions"
              loading={creating}
            />
          }
        >
          {creating ? null : <MoreHorizontal aria-hidden />}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={6} className="z-50">
            <Menu.Popup className="min-w-56 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-popover outline-none">
              <Menu.LinkItem
                render={<Link href={`/patients/${patientId}`} />}
                className={menuItemClass}
              >
                <FolderOpen className="size-4 text-muted-foreground" aria-hidden />
                Ouvrir le dossier patient
              </Menu.LinkItem>
              {canCreateFollowUp ? (
                <Menu.Item className={menuItemClass} onClick={createFollowUp}>
                  <RefreshCw className="size-4 text-muted-foreground" aria-hidden />
                  Créer un suivi
                </Menu.Item>
              ) : null}
              <div role="separator" className="my-1 h-px bg-border" />
              <Menu.Item
                className={cn(menuItemClass, 'text-danger-ink data-highlighted:bg-danger-tint')}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" aria-hidden />
                Supprimer la consultation…
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <DeleteConsultationDialog
        consultationId={consultationId}
        patientFullName={patientFullName}
        isPaid={isPaid}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
