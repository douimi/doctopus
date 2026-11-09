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
  createAttachmentUploadAction,
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
import {
  baseMime,
  type ChatMessage,
  type ConversationRef,
  type MessageKind,
  type PatientRef,
} from '@/lib/messaging/types';
import { useTenantActivity } from '@/components/shell/tenant-realtime';
import { ATTACHMENT_BUCKET, QUICK_REPLIES_CHANGED_EVENT } from './constants';
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
import { displayName } from '@/lib/messaging/types';

/** What the composer hands to `send`. */
export type Draft =
  | { kind: 'text' | 'quick'; body: string; patient: PatientRef | null }
  | { kind: 'attachment'; file: File; body: string; patient: PatientRef | null }
  | { kind: 'voice'; blob: Blob; mime: string; durationMs: number; patient: PatientRef | null };

/** "Write about this patient" request (e.g. from /today), consumed by the composer. */
export type ComposeRequest = { conversationId: string; patient: PatientRef; nonce: number };

type PendingUpload = { blob: Blob; name: string; mime: string; path: string | null };

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
  send: (conversationId: string, draft: Draft) => Promise<boolean>;
  /** Open the cabinet thread in the dock with this patient attached. */
  composeAbout: (patient: PatientRef) => Promise<void>;
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
const ComposeContext = createContext<ComposeRequest | null>(null);

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
  const [compose, setCompose] = useState<ComposeRequest | null>(null);
  const uploadsRef = useRef(new Map<string, PendingUpload>());
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
      return data;
    } catch {
      /* transient; next visibility/reconnect retries */
      return null;
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
    const onChanged = () => void bootstrap();
    window.addEventListener(QUICK_REPLIES_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(QUICK_REPLIES_CHANGED_EVENT, onChanged);
  }, [bootstrap]);

  // Patient cards show the linked appointment's live status.
  useTenantActivity((event) => {
    if (event.table !== 'appointments') return;
    dispatch({
      type: 'appointmentStatus',
      appointmentId: event.id,
      status: event.op === 'DELETE' ? null : event.status,
    });
  });

  // ── alerts for incoming messages ─────────────────────────────────────
  const alertFor = useCallback((message: ChatMessage, conversation: ConversationRef) => {
    const s = stateRef.current;
    const conv = s.conversations[conversation.id];
    if (conv?.muted) return;
    const title = conversationTitle(conversation, s.me?.id ?? userId, s.team);
    const preview = messagePreview(message);
    const sender = displayName(s.team.find((m) => m.id === message.senderId) ?? null);
    const heading = conversation.kind === 'cabinet' ? `${sender} · ${title}` : sender;
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

  /** Uploads the file (once) then records the message. Safe to call again on retry. */
  const deliver = useCallback(async (message: ChatMessage): Promise<boolean> => {
    const fail = (description: string) => {
      dispatch({ type: 'sendFailed', conversationId: message.conversationId, id: message.id });
      showToast({ title: 'Message non envoyé', description, variant: 'warning' });
      return false;
    };
    try {
      let attachment: { path: string; name: string; mime: string; bytes: number } | null = null;
      const upload = uploadsRef.current.get(message.id);
      if (upload) {
        if (!upload.path) {
          const target = await createAttachmentUploadAction({
            conversationId: message.conversationId,
            mime: upload.mime,
            bytes: upload.blob.size,
          });
          if (!target.ok) return fail(target.error);
          const { error } = await getSupabaseBrowserClient()
            .storage.from(ATTACHMENT_BUCKET)
            .uploadToSignedUrl(target.path, target.token, upload.blob, { contentType: upload.mime });
          if (error) return fail('Le fichier n’a pas pu être envoyé. Réessayez.');
          upload.path = target.path;
        }
        attachment = { path: upload.path, name: upload.name, mime: upload.mime, bytes: upload.blob.size };
      }
      const res = await sendMessageAction({
        id: message.id,
        conversationId: message.conversationId,
        kind: message.kind,
        body: message.body,
        patientId: message.patientId,
        attachment,
        voiceDurationMs: message.voiceDurationMs,
      });
      if (!res.ok) return fail(res.error);
      uploadsRef.current.delete(message.id);
      if (message.localUrl) setTimeout(() => URL.revokeObjectURL(message.localUrl!), 60_000);
      dispatch({ type: 'sendSucceeded', message: res.message });
      return true;
    } catch {
      return fail('Connexion perdue. Touchez le message pour réessayer.');
    }
  }, []);

  const send = useCallback(
    async (conversationId: string, draft: Draft) => {
      const me = stateRef.current.me;
      if (!me) return false;
      const body = 'body' in draft ? draft.body.trim() : '';
      let kind: MessageKind = draft.kind;
      let file: { blob: Blob; name: string; mime: string } | null = null;
      if (draft.kind === 'attachment') {
        file = { blob: draft.file, name: draft.file.name || 'fichier', mime: baseMime(draft.file.type) };
      } else if (draft.kind === 'voice') {
        const mime = baseMime(draft.mime);
        file = { blob: draft.blob, name: `note-vocale.${mime.split('/')[1] ?? 'webm'}`, mime };
      } else if (!body && !draft.patient) {
        return false;
      }
      if (draft.kind === 'quick' && !body) kind = 'text';
      const id = crypto.randomUUID();
      const localUrl = file ? URL.createObjectURL(file.blob) : undefined;
      if (file) uploadsRef.current.set(id, { ...file, path: null });
      const message: ChatMessage = {
        id,
        conversationId,
        senderId: me.id,
        senderName: me.fullName,
        kind,
        body: body || null,
        patientId: draft.patient?.id ?? null,
        patientName: draft.patient?.name ?? null,
        appointmentId: null,
        appointmentStatus: null,
        attachmentName: file?.name ?? null,
        attachmentMime: file?.mime ?? null,
        attachmentBytes: file?.blob.size ?? null,
        voiceDurationMs: draft.kind === 'voice' ? Math.round(draft.durationMs) : null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
        pending: 'sending',
        localUrl,
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

  const composeAbout = useCallback(
    async (patient: PatientRef) => {
      let cabinetId = Object.values(stateRef.current.conversations).find((c) => c.kind === 'cabinet')?.id;
      // Right after a page load the inbox may still be loading: wait for it.
      if (!cabinetId) cabinetId = (await bootstrap())?.conversations.find((c) => c.kind === 'cabinet')?.id;
      if (!cabinetId) {
        showToast({ title: 'Messagerie indisponible', description: 'Réessayez dans un instant.', variant: 'warning' });
        return;
      }
      setCompose({ conversationId: cabinetId, patient, nonce: Date.now() });
      openDockRef.current(cabinetId);
    },
    [bootstrap],
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
      composeAbout,
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
      composeAbout,
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
          <ComposeContext.Provider value={compose}>
            <StateContext.Provider value={state}>{children}</StateContext.Provider>
          </ComposeContext.Provider>
        </DockContext.Provider>
      </PermissionContext.Provider>
    </ApiContext.Provider>
  );
}

export function useComposeRequest(): ComposeRequest | null {
  return useContext(ComposeContext);
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
