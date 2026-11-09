'use client';

import { useState } from 'react';
import { BellOff, Loader2, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { usePresence } from '@/components/shell/tenant-realtime';
import { directConversationWith } from '@/lib/messaging/store';
import type { ConversationSummary, TeamMember } from '@/lib/messaging/types';
import { cn } from '@/lib/utils';
import { CABINET_TITLE, listTime, messagePreview, roleLabel } from './format';
import { useMessaging, useMessagingState } from './messaging-provider';

type Row = {
  key: string;
  title: string;
  subtitle: string;
  conversation: ConversationSummary | null;
  peer: TeamMember | null;
};

export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-primary px-1.5 text-[11px] font-semibold leading-none tabular-nums text-primary-foreground',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

/**
 * Cabinet thread pinned first, then one row per teammate (a direct thread
 * is created on first open). Deactivated members only appear when a
 * conversation with them already exists.
 */
export function ConversationList({
  activeId,
  onOpen,
}: {
  activeId: string | null;
  onOpen: (conversationId: string) => void;
}) {
  const state = useMessagingState();
  const { openDirect } = useMessaging();
  const presence = usePresence();
  const [opening, setOpening] = useState<string | null>(null);
  const me = state.me?.id ?? '';

  const cabinet = Object.values(state.conversations).find((c) => c.kind === 'cabinet') ?? null;
  const rows: Row[] = [];
  if (cabinet) {
    rows.push({
      key: cabinet.id,
      title: CABINET_TITLE,
      subtitle: 'Toute l’équipe',
      conversation: cabinet,
      peer: null,
    });
  }
  const peers: Row[] = state.team
    .filter((m) => m.id !== me)
    .map((m) => ({
      key: m.id,
      title: m.fullName,
      subtitle: roleLabel(m.role),
      conversation: directConversationWith(state, m.id),
      peer: m,
    }))
    .filter((r) => r.peer!.active || r.conversation?.lastMessage);
  peers.sort((a, b) => {
    const ta = a.conversation?.lastMessageAt ? Date.parse(a.conversation.lastMessageAt) : 0;
    const tb = b.conversation?.lastMessageAt ? Date.parse(b.conversation.lastMessageAt) : 0;
    if (ta !== tb) return tb - ta;
    return a.title.localeCompare(b.title, 'fr');
  });
  rows.push(...peers);

  async function open(row: Row) {
    if (row.conversation) return onOpen(row.conversation.id);
    if (!row.peer) return;
    setOpening(row.key);
    const id = await openDirect(row.peer.id);
    setOpening(null);
    if (id) onOpen(id);
  }

  if (!state.ready) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        <span className="sr-only">Chargement des conversations</span>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border" aria-label="Conversations">
      {rows.map((row) => {
        const conv = row.conversation;
        const last = conv?.lastMessage ?? null;
        const typingHere =
          conv &&
          [...presence.typing.entries()].some(([uid, cid]) => uid !== me && cid === conv.id);
        const online = row.peer ? presence.online.has(row.peer.id) : false;
        const inactive = row.peer ? !row.peer.active : false;
        const unread = conv?.unread ?? 0;
        let preview = row.subtitle;
        if (last) {
          const who = last.senderId === me ? 'Vous : ' : conv?.kind === 'cabinet' ? `${last.senderName.split(' ')[0]} : ` : '';
          preview = `${who}${messagePreview(last)}`;
        }
        return (
          <li key={row.key}>
            <button
              type="button"
              onClick={() => void open(row)}
              disabled={opening === row.key}
              aria-current={activeId !== null && conv?.id === activeId ? 'true' : undefined}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-(--duration-fast)',
                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                'aria-[current=true]:bg-(--nav-accent-tint,var(--color-muted))',
              )}
            >
              <span className="relative shrink-0">
                {row.peer ? (
                  <Avatar name={row.title} tone={inactive ? 'muted' : 'primary'} />
                ) : (
                  <span className="inline-flex size-8 items-center justify-center rounded-pill bg-primary text-primary-foreground">
                    <Users className="size-4" aria-hidden />
                  </span>
                )}
                {online ? (
                  <span
                    className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-success ring-2 ring-card"
                    aria-label="En ligne"
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      'truncate text-body text-foreground',
                      unread > 0 && 'font-semibold',
                      inactive && 'text-muted-foreground',
                    )}
                  >
                    {row.title}
                  </span>
                  {conv?.muted ? (
                    <BellOff className="size-3 shrink-0 text-subtle-foreground" aria-label="Sourdine" />
                  ) : null}
                  <span className="ml-auto shrink-0 text-micro text-subtle-foreground tabular-nums">
                    {listTime(last?.createdAt ?? null)}
                  </span>
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span
                    className={cn(
                      'truncate text-small',
                      typingHere ? 'text-primary' : 'text-muted-foreground',
                      unread > 0 && !typingHere && 'text-foreground',
                    )}
                  >
                    {typingHere ? 'écrit…' : preview}
                  </span>
                  <UnreadBadge count={unread} className="ml-auto shrink-0" />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
