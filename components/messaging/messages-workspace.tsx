'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cabinetConversation } from '@/lib/messaging/store';
import { cn } from '@/lib/utils';
import { NotificationPrompt } from './chat-dock';
import { ConversationList } from './conversation-list';
import { useMessagingState } from './messaging-provider';
import { Thread } from './thread';

/**
 * Full-page messaging: conversation list | thread on desktop, list → thread
 * on mobile. The selected conversation lives in `?c=` so toasts and
 * notifications can deep-link to it.
 */
export function MessagesWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  const state = useMessagingState();
  const requested = params.get('c');
  const selected =
    requested && state.conversations[requested] ? requested : null;
  // Desktop opens on the cabinet thread when nothing is selected.
  const desktopDefault = selected ?? cabinetConversation(state)?.id ?? null;

  const select = (id: string | null) =>
    router.replace(id ? `/messages?c=${id}` : '/messages', { scroll: false });

  return (
    <div className="flex h-[calc(100dvh-3.5rem-3.5rem-env(safe-area-inset-bottom))] min-h-0 overflow-hidden border-border bg-card md:h-dvh md:border-l">
      <section
        aria-label="Conversations"
        className={cn(
          'flex min-h-0 w-full min-w-0 flex-col border-r border-border md:w-80 md:shrink-0',
          selected && 'hidden md:flex',
        )}
      >
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
          <MessageSquare className="size-4 text-primary" aria-hidden />
          <h1 className="text-body font-semibold text-foreground">Messagerie</h1>
        </header>
        <NotificationPrompt />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ConversationList activeId={desktopDefault} onOpen={(id) => select(id)} />
        </div>
      </section>

      <section
        aria-label="Conversation"
        className={cn('min-h-0 min-w-0 flex-1 flex-col', selected ? 'flex' : 'hidden md:flex')}
      >
        {desktopDefault ? (
          <Thread
            key={desktopDefault}
            conversationId={desktopDefault}
            autoFocus
            leading={
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                onClick={() => select(null)}
                aria-label="Toutes les conversations"
              >
                <ArrowLeft aria-hidden />
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="Messagerie du cabinet"
            description="Choisissez une conversation."
            className="flex-1"
          />
        )}
      </section>
    </div>
  );
}
