'use client';

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Bell, BellOff, Loader2, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { usePresence } from '@/components/shell/tenant-realtime';
import { peerOf } from '@/lib/messaging/types';
import { cn } from '@/lib/utils';
import { Composer } from './composer';
import { conversationTitle, daySeparator, memberName, memberShortName, roleLabel, sameDay } from './format';
import { MessageBubble, type ReadState } from './message-bubble';
import { useMessaging, useMessagingState } from './messaging-provider';

const NEAR_BOTTOM_PX = 120;

/**
 * One conversation: header, scrollable history (older pages on demand),
 * read ticks, typing line and composer. Registers itself as the viewed
 * conversation so incoming messages are marked read instead of alerting.
 */
export function Thread({
  conversationId,
  leading,
  trailing,
  autoFocus,
}: {
  conversationId: string;
  /** Header slot before the title (e.g. back button). */
  leading?: ReactNode;
  /** Header slot after the actions (e.g. close button). */
  trailing?: ReactNode;
  autoFocus?: boolean;
}) {
  const state = useMessagingState();
  const { loadLatest, loadOlder, setViewing, setMuted, markRead } = useMessaging();
  const presence = usePresence();
  const conv = state.conversations[conversationId];
  const thread = state.threads[conversationId];
  const me = state.me?.id ?? '';
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickToBottom = useRef(true);
  const prevHeight = useRef<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setViewing(conversationId);
    return () => setViewing(null);
  }, [conversationId, setViewing]);

  // Unread can appear after mount (bootstrap landing late, a message while
  // the tab was hidden): an on-screen thread clears it as soon as it's seen.
  const unread = conv?.unread ?? 0;
  useEffect(() => {
    if (unread > 0 && document.visibilityState === 'visible') markRead(conversationId);
  }, [unread, conversationId, markRead]);

  useEffect(() => {
    stickToBottom.current = true;
    let cancelled = false;
    loadLatest(conversationId).catch(() => {
      if (!cancelled) setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId, loadLatest]);

  const messages = thread?.messages ?? [];
  const lastId = messages.at(-1)?.id;

  // Keep the view pinned to the newest message, and keep the reading
  // position stable when an older page is prepended.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prevHeight.current !== null) {
      el.scrollTop += el.scrollHeight - prevHeight.current;
      prevHeight.current = null;
      return;
    }
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, lastId]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }

  async function older() {
    const el = scrollRef.current;
    setLoadingOlder(true);
    prevHeight.current = el?.scrollHeight ?? null;
    try {
      await loadOlder(conversationId);
    } catch {
      prevHeight.current = null;
    } finally {
      setLoadingOlder(false);
    }
  }

  if (!conv || !state.me) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
      </div>
    );
  }

  const title = conversationTitle(conv, me, state.team);
  const peerId = peerOf(conv, me);
  const peer = peerId ? state.team.find((m) => m.id === peerId) ?? null : null;
  const online = peerId ? presence.online.has(peerId) : false;
  const typers = [...presence.typing.entries()]
    .filter(([uid, cid]) => uid !== me && cid === conversationId)
    .map(([uid]) => memberShortName(state.team, uid));
  const activeTeam = state.team.filter((m) => m.active);
  const onlineCount = activeTeam.filter((m) => presence.online.has(m.id)).length;
  const subtitle =
    conv.kind === 'cabinet'
      ? `${activeTeam.length} membres · ${onlineCount} en ligne`
      : peer
        ? `${roleLabel(peer.role)} · ${!peer.active ? 'inactif' : online ? 'en ligne' : 'hors ligne'}`
        : '';

  const lastOwnIndex = messages.findLastIndex((m) => m.senderId === me && !m.deletedAt);

  function readStateFor(createdAt: string): ReadState {
    if (conv.kind !== 'direct' || !peerId) return 'sent';
    const r = conv.reads[peerId];
    return r && Date.parse(r) >= Date.parse(createdAt) ? 'read' : 'sent';
  }

  function readersOf(createdAt: string): string[] {
    return Object.entries(conv.reads)
      .filter(([uid, at]) => uid !== me && Date.parse(at) >= Date.parse(createdAt))
      .map(([uid]) => memberShortName(state.team, uid));
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2.5">
        {leading}
        <span className="relative shrink-0">
          {peer ? (
            <Avatar name={peer.fullName} size="md" tone={peer.active ? 'primary' : 'muted'} />
          ) : (
            <span className="inline-flex size-8 items-center justify-center rounded-pill bg-primary text-primary-foreground">
              <Users className="size-4" aria-hidden />
            </span>
          )}
          {online ? (
            <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-success ring-2 ring-card" />
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-body font-medium text-foreground">{title}</div>
          <div className="truncate text-micro text-muted-foreground">{subtitle}</div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => void setMuted(conv.id, !conv.muted)}
          aria-label={conv.muted ? 'Réactiver les alertes' : 'Mettre en sourdine'}
          title={conv.muted ? 'Réactiver les alertes' : 'Mettre en sourdine'}
        >
          {conv.muted ? <BellOff aria-hidden /> : <Bell aria-hidden />}
        </Button>
        {trailing}
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
        aria-live="polite"
        aria-relevant="additions"
      >
        {!thread?.loaded ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            {error ? (
              <span className="text-small">Impossible de charger la conversation.</span>
            ) : (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            )}
          </div>
        ) : (
          <>
            {thread.hasMore ? (
              <div className="mb-3 flex justify-center">
                <Button variant="outline" size="xs" onClick={() => void older()} loading={loadingOlder}>
                  Messages précédents
                </Button>
              </div>
            ) : null}
            {messages.length === 0 ? (
              <p className="py-10 text-center text-small text-muted-foreground">
                {conv.kind === 'cabinet'
                  ? 'Aucun message. Écrivez à toute l’équipe du cabinet.'
                  : `Aucun message. Démarrez la conversation avec ${title}.`}
              </p>
            ) : null}
            <div className="flex flex-col gap-1">
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
                const mine = m.senderId === me;
                const runBreak =
                  !prev ||
                  newDay ||
                  prev.senderId !== m.senderId ||
                  Date.parse(m.createdAt) - Date.parse(prev.createdAt) > 5 * 60_000;
                const isLastOwn = i === lastOwnIndex;
                return (
                  <Fragment key={m.id}>
                    {newDay ? (
                      <div className="my-2 flex justify-center">
                        <span className="rounded-pill bg-muted px-2.5 py-0.5 text-micro font-medium text-muted-foreground first-letter:uppercase">
                          {daySeparator(m.createdAt)}
                        </span>
                      </div>
                    ) : null}
                    <div className={cn(runBreak && i > 0 && 'mt-2')}>
                      <MessageBubble
                        message={m}
                        mine={mine}
                        senderLabel={!mine && runBreak && conv.kind === 'cabinet' ? memberName(state.team, m.senderId) : null}
                        readState={mine ? readStateFor(m.createdAt) : 'none'}
                        now={now}
                        readBy={
                          isLastOwn && conv.kind === 'cabinet' && !m.pending
                            ? readersOf(m.createdAt)
                            : undefined
                        }
                      />
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="h-5 shrink-0 px-3.5 text-micro text-primary" aria-live="polite" data-testid="typing-line">
        {typers.length > 0
          ? `${typers.join(', ')} ${typers.length > 1 ? 'écrivent' : 'écrit'}…`
          : null}
      </div>
      <Composer
        conversationId={conversationId}
        disabled={peer !== null && !peer.active}
        autoFocus={autoFocus}
      />
    </div>
  );
}
