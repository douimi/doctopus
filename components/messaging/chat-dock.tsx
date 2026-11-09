'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, BellRing, Maximize2, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationList } from './conversation-list';
import {
  useMessaging,
  useMessagingDock,
  useNotificationPermission,
} from './messaging-provider';
import { Thread } from './thread';

/** Contextual (never on page load) prompt for desktop notifications. */
export function NotificationPrompt() {
  const permission = useNotificationPermission();
  const { requestNotifications } = useMessaging();
  if (permission !== 'default') return null;
  return (
    <div className="flex items-center gap-2 border-b border-border bg-primary-tint px-3 py-2 text-small text-primary-ink">
      <BellRing className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">Soyez alerté(e) des messages même quand l’onglet est en arrière-plan.</span>
      <Button size="xs" variant="secondary" onClick={() => void requestNotifications()}>
        Activer
      </Button>
    </div>
  );
}

/**
 * Right-side messaging panel, available on every authenticated screen so
 * the doctor never leaves the consultation to answer. Full-screen on
 * mobile. Escape closes it; Alt+M toggles it (see MessagingProvider).
 */
export function ChatDock() {
  const dock = useMessagingDock();
  const { closeDock, setDockConversation } = useMessaging();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!dock.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDock();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dock.open, closeDock]);

  if (!dock.open) return null;

  const closeButton = (
    <Button variant="ghost" size="icon-sm" onClick={closeDock} aria-label="Fermer la messagerie">
      <X aria-hidden />
    </Button>
  );

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-label="Messagerie du cabinet"
      style={{ animation: 'doctopus-dock-in 180ms ease-out' }}
      className="fixed inset-0 z-50 flex flex-col bg-card text-card-foreground md:inset-y-0 md:right-0 md:left-auto md:w-[400px] md:border-l md:border-border md:shadow-dialog"
    >
      {dock.conversationId ? (
        <Thread
          key={dock.conversationId}
          conversationId={dock.conversationId}
          autoFocus
          leading={
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDockConversation(null)}
              aria-label="Toutes les conversations"
            >
              <ArrowLeft aria-hidden />
            </Button>
          }
          trailing={closeButton}
        />
      ) : (
        <>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
            <MessageSquare className="size-4 text-primary" aria-hidden />
            <h2 className="flex-1 text-body font-semibold text-foreground">Messagerie</h2>
            <Link
              href="/messages"
              onClick={closeDock}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Ouvrir en plein écran"
              title="Ouvrir en plein écran"
            >
              <Maximize2 className="size-4" aria-hidden />
            </Link>
            {closeButton}
          </header>
          <NotificationPrompt />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ConversationList activeId={null} onOpen={(id) => setDockConversation(id)} />
          </div>
          <p className="hidden border-t border-border px-3 py-2 text-micro text-subtle-foreground md:block">
            Raccourci : Alt+M pour ouvrir ou fermer
          </p>
        </>
      )}
    </aside>
  );
}
