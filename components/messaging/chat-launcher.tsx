'use client';

import { MessageSquare } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { totalUnread } from '@/lib/messaging/store';
import { cn } from '@/lib/utils';
import { UnreadBadge } from './conversation-list';
import { useMessaging, useMessagingDock, useMessagingState } from './messaging-provider';

/** Message icon + unread badge next to the bell; toggles the dock. */
export function ChatLauncher() {
  const state = useMessagingState();
  const dock = useMessagingDock();
  const { toggleDock } = useMessaging();
  const unread = totalUnread(state);
  const label =
    unread > 0
      ? `Messagerie — ${unread} message${unread === 1 ? '' : 's'} non lu${unread === 1 ? '' : 's'}`
      : 'Messagerie';

  return (
    <button
      type="button"
      onClick={toggleDock}
      aria-label={label}
      aria-expanded={dock.open}
      title={`${label} (Alt+M)`}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'relative',
        unread > 0 && 'text-foreground',
      )}
    >
      <MessageSquare className="size-4" aria-hidden />
      {unread > 0 ? (
        <span
          aria-hidden
          className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none tabular-nums text-primary-foreground ring-2 ring-sidebar"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </button>
  );
}

/** Unread count inside the "Messages" sidebar entry. */
export function MessagesNavBadge() {
  const unread = totalUnread(useMessagingState());
  return <UnreadBadge count={unread} className="ml-auto" />;
}
