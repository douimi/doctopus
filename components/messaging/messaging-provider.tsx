'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { createTenantChannel, ensureRealtimeAuth } from '@/lib/supabase/realtime';
import { showToast } from '@/components/ui/toast';
import {
  deleteMessageAction,
  getMessagingBootstrapAction,
  listMessagesAction,
  markConversationReadAction,
  messagesSinceAction,
  openDirectConversationAction,
  sendMessageAction,
  setConversationMutedAction,
} from '@/app/(authenticated)/messages/actions';
import {
  initialMessagingState,
  latestSeen,
  messagingReducer,
  totalUnread,
  type MessagingState,
} from '@/lib/messaging/store';
import type { ChatMessage, ConversationRef } from '@/lib/messaging/types';
import {
  notificationPermission,
  playChime,
  requestNotificationPermission,
  showSystemNotification,
  subscribeNotificationPermission,
  syncTitlePrefix,
  type NotificationPermissionState,
} from '@/lib/messaging/alerts';
import { conversationTitle, messagePreview } from './format';

type MessagingApi = {
  /** Open the side panel, optionally on a conversation. */
  openDock: (conversationId?: string | null) => void;
  closeDock: () => void;
  toggleDock: () => void;
  /** Conversation shown in the dock (null = list). */
  setDockConversation: (conversationId: string | null) => void;
  /** A thread component is on screen for this conversation (or null). */
  setViewing: (conversationId: string | null) => void;
  markRead: (conversationId: string) => void;
  loadLatest: (conversationId: string) => Promise<void>;
  loadOlder: (conversationId: string) => Promise<void>;
  send: (conversationId: string, body: string) => Promise<boolean>;
  retry: (message: ChatMessage) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<void>;
  openDirect: (peerId: string) => Promise<string | null>;
  setMuted: (conversationId: string, muted: boolean) => Promise<void>;
  requestNotifications: () => Promise<void>;
};

type DockState = { open: boolean; conversationId: string | null };

const StateContext = createContext<MessagingState>(initialMessagingState);
const DockContext = createContext<DockState>({ open: false, conversationId: null });
const ApiContext = createContext<MessagingApi | null>(null);
const PermissionContext = createContext<NotificationPermissionState>('default');

type NewPayload = { conversation: ConversationRef; message: ChatMessage };
type ReadPayload = { conversationId: string; userId: string; lastReadAt: string };

/**
 * Cabinet messaging runtime, mounted once in the authenticated shell:
 * holds the store, the private `user:<me>` inbox channel, catch-up after
 * socket drops, read receipts, and alerts (sound / toast / system
 * notification / tab title).
 */
export function MessagingProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, dispatch] = useReducer(messagingReducer, initialMessagingState);
  const [dock, setDock] = useState<DockState>({ open: false, conversationId: null });
  const permission = useSyncExternalStore<NotificationPermissionState>(
    subscribeNotificationPermission,
    notificationPermission,
    () => 'default',
  );

  const stateRef = useRef(state);
  const viewingRef = useRef<string | null>(null);
  const openDockRef = useRef<(id?: string | null) => void>(() => {});
  useEffect(() => {
    stateRef.current = state;
  });

  // ── read receipts ────────────────────────────────────────────────────
  const markRead = useCallback((conversationId: string) => {
    dispatch({ type: 'markedRead', conversationId });
    void markConversationReadAction(conversationId).catch(() => {});
  }, []);

  const isActivelyViewing = (conversationId: string) =>
    viewingRef.current === conversationId && document.visibilityState === 'visible';

  // ── bootstrap + catch-up ─────────────────────────────────────────────
  const bootstrap = useCallback(async () => {
    try {
      const data = await getMessagingBootstrapAction();
      dispatch({ type: 'bootstrap', data });
    } catch {
      /* transient; next visibility/reconnect retries */
    }
  }, []);

  const catchUp = useCallback(async () => {
    const since = latestSeen(stateRef.current);
    if (since) {
      try {
        const missed = await messagesSinceAction(since);
        if (missed.length) dispatch({ type: 'messagesMerged', messages: missed });
      } catch {
        /* ignore */
      }
    }
    await bootstrap();
    const viewing = viewingRef.current;
    if (viewing && document.visibilityState === 'visible') {
      if ((stateRef.current.conversations[viewing]?.unread ?? 0) > 0) markRead(viewing);
    }
  }, [bootstrap, markRead]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // ── alerts for incoming messages ─────────────────────────────────────
  const alertFor = useCallback((message: ChatMessage, conversation: ConversationRef) => {
    const s = stateRef.current;
    const conv = s.conversations[conversation.id];
    if (conv?.muted) return;
    const title = conversationTitle(conversation, s.me?.id ?? userId, s.team);
    const preview = messagePreview(message);
    const heading =
      conversation.kind === 'cabinet' ? `${message.senderName} · ${title}` : message.senderName;
    playChime();
    if (document.visibilityState === 'hidden') {
      showSystemNotification({
        title: heading,
        body: preview,
        tag: `msg:${conversation.id}`,
        onClick: () => openDockRef.current(conversation.id),
      });
      return;
    }
    showToast({
      id: `msg:${conversation.id}`,
      title: heading,
      description: preview.length > 140 ? `${preview.slice(0, 140)}…` : preview,
      href: `/messages?c=${conversation.id}`,
      hrefLabel: 'Répondre',
      variant: 'info',
    });
  }, [userId]);

  // ── realtime inbox ───────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let joinedOnce = false;

    void (async () => {
      await ensureRealtimeAuth(supabase);
      if (cancelled) return;
      channel = createTenantChannel(supabase, `user:${userId}`, { private: true });
      channel
        .on('broadcast', { event: 'message.new' }, ({ payload }) => {
          const { message, conversation } = payload as NewPayload;
          const s = stateRef.current;
          const thread = s.threads[message.conversationId];
          const alreadyKnown =
            thread?.messages.some((m) => m.id === message.id) ||
            s.conversations[message.conversationId]?.lastMessage?.id === message.id;
          const fromOther = message.senderId !== userId;
          dispatch({ type: 'messageReceived', message, conversation, live: true });
          if (!fromOther || alreadyKnown) return;
          if (isActivelyViewing(message.conversationId)) {
            markRead(message.conversationId);
            return;
          }
          alertFor(message, conversation);
        })
        .on('broadcast', { event: 'message.deleted' }, ({ payload }) => {
          const { message, conversation } = payload as NewPayload;
          dispatch({ type: 'messageReceived', message, conversation, live: false });
        })
        .on('broadcast', { event: 'conversation.read' }, ({ payload }) => {
          const p = payload as ReadPayload;
          dispatch({ type: 'readReceived', ...p });
        })
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') return;
          if (joinedOnce) void catchUp();
          joinedOnce = true;
        });
    })();

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void catchUp();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, alertFor, catchUp, markRead]);

  // ── tab title ────────────────────────────────────────────────────────
  const unread = totalUnread(state);
  useEffect(() => syncTitlePrefix(unread), [unread]);

  // ── dock ─────────────────────────────────────────────────────────────
  const onMessagesPage = pathname === '/messages';

  const openDock = useCallback(
    (conversationId?: string | null) => {
      if (onMessagesPage) {
        if (conversationId) router.replace(`/messages?c=${conversationId}`);
        return;
      }
      setDock((d) => ({
        open: true,
        conversationId: conversationId === undefined ? d.conversationId : conversationId,
      }));
    },
    [onMessagesPage, router],
  );
  useEffect(() => {
    openDockRef.current = openDock;
  }, [openDock]);

  const closeDock = useCallback(() => setDock((d) => ({ ...d, open: false })), []);
  const toggleDock = useCallback(() => {
    if (onMessagesPage) return;
    setDock((d) => ({ ...d, open: !d.open }));
  }, [onMessagesPage]);
  const setDockConversation = useCallback(
    (conversationId: string | null) => setDock((d) => ({ ...d, conversationId })),
    [],
  );

  // The dock never sits on top of the full /messages page.
  if (onMessagesPage && dock.open) setDock((d) => ({ ...d, open: false }));

  // Alt+M toggles the dock from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'm' || e.key === 'M' || e.code === 'KeyM')) {
        e.preventDefault();
        toggleDock();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleDock]);

  // ── API ──────────────────────────────────────────────────────────────
  const setViewing = useCallback(
    (conversationId: string | null) => {
      viewingRef.current = conversationId;
      if (!conversationId) return;
      if ((stateRef.current.conversations[conversationId]?.unread ?? 0) > 0) {
        markRead(conversationId);
      }
    },
    [markRead],
  );

  const loadLatest = useCallback(async (conversationId: string) => {
    const page = await listMessagesAction({ conversationId });
    dispatch({ type: 'threadLoaded', conversationId, page, mode: 'latest' });
  }, []);

  const loadOlder = useCallback(async (conversationId: string) => {
    const oldest = stateRef.current.threads[conversationId]?.messages.find((m) => !m.pending);
    const page = await listMessagesAction({ conversationId, before: oldest?.createdAt ?? null });
    dispatch({ type: 'threadLoaded', conversationId, page, mode: 'older' });
  }, []);

  const deliver = useCallback(async (message: ChatMessage): Promise<boolean> => {
    try {
      const res = await sendMessageAction({
        id: message.id,
        conversationId: message.conversationId,
        body: message.body ?? '',
      });
      if (res.ok) {
        dispatch({ type: 'sendSucceeded', message: res.message });
        return true;
      }
      dispatch({ type: 'sendFailed', conversationId: message.conversationId, id: message.id });
      showToast({ title: 'Message non envoyé', description: res.error, variant: 'warning' });
      return false;
    } catch {
      dispatch({ type: 'sendFailed', conversationId: message.conversationId, id: message.id });
      showToast({
        title: 'Message non envoyé',
        description: 'Connexion perdue. Touchez le message pour réessayer.',
        variant: 'warning',
      });
      return false;
    }
  }, []);

  const send = useCallback(
    async (conversationId: string, body: string) => {
      const me = stateRef.current.me;
      const text = body.trim();
      if (!me || !text) return false;
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        conversationId,
        senderId: me.id,
        senderName: me.fullName,
        kind: 'text',
        body: text,
        patientId: null,
        appointmentId: null,
        attachmentName: null,
        attachmentMime: null,
        attachmentBytes: null,
        voiceDurationMs: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
        pending: 'sending',
      };
      dispatch({ type: 'optimisticAdded', message });
      return deliver(message);
    },
    [deliver],
  );

  const retry = useCallback(
    async (message: ChatMessage) => {
      const again: ChatMessage = { ...message, pending: 'sending' };
      dispatch({ type: 'optimisticAdded', message: again });
      return deliver(again);
    },
    [deliver],
  );

  const deleteMessage = useCallback(async (messageId: string) => {
    const ok = await deleteMessageAction(messageId).catch(() => false);
    if (!ok) {
      showToast({
        title: 'Suppression impossible',
        description: 'Un message ne peut être supprimé que dans les 15 minutes après son envoi.',
        variant: 'warning',
      });
    }
  }, []);

  const openDirect = useCallback(async (peerId: string) => {
    const conv = await openDirectConversationAction(peerId).catch(() => null);
    if (!conv) {
      showToast({ title: 'Conversation indisponible', variant: 'warning' });
      return null;
    }
    dispatch({ type: 'conversationUpserted', conversation: conv });
    return conv.id;
  }, []);

  const setMuted = useCallback(async (conversationId: string, muted: boolean) => {
    dispatch({ type: 'mutedChanged', conversationId, muted });
    const ok = await setConversationMutedAction(conversationId, muted).catch(() => false);
    if (!ok) dispatch({ type: 'mutedChanged', conversationId, muted: !muted });
  }, []);

  const requestNotifications = useCallback(async () => {
    await requestNotificationPermission();
  }, []);

  const api = useMemo<MessagingApi>(
    () => ({
      openDock,
      closeDock,
      toggleDock,
      setDockConversation,
      setViewing,
      markRead,
      loadLatest,
      loadOlder,
      send,
      retry,
      deleteMessage,
      openDirect,
      setMuted,
      requestNotifications,
    }),
    [
      openDock,
      closeDock,
      toggleDock,
      setDockConversation,
      setViewing,
      markRead,
      loadLatest,
      loadOlder,
      send,
      retry,
      deleteMessage,
      openDirect,
      setMuted,
      requestNotifications,
    ],
  );

  return (
    <ApiContext.Provider value={api}>
      <PermissionContext.Provider value={permission}>
        <DockContext.Provider value={dock}>
          <StateContext.Provider value={state}>{children}</StateContext.Provider>
        </DockContext.Provider>
      </PermissionContext.Provider>
    </ApiContext.Provider>
  );
}

export function useMessagingState(): MessagingState {
  return useContext(StateContext);
}

export function useMessagingDock(): DockState {
  return useContext(DockContext);
}

export function useNotificationPermission(): NotificationPermissionState {
  return useContext(PermissionContext);
}

export function useMessaging(): MessagingApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('MessagingProvider is missing');
  return api;
}
