'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { createTenantChannel, ensureRealtimeAuth } from '@/lib/supabase/realtime';

/**
 * Minimal activity ping published by the `broadcast_tenant_activity`
 * trigger (migration 0019). Never carries clinical text.
 */
export type TenantActivity =
  | {
      table: 'appointments';
      op: 'INSERT' | 'UPDATE' | 'DELETE';
      id: string;
      patientId: string | null;
      status: string | null;
      oldStatus: string | null;
    }
  | {
      table: 'consultations';
      op: 'INSERT' | 'UPDATE' | 'DELETE';
      id: string;
      appointmentId: string | null;
      isFinalized: boolean | null;
      oldIsFinalized: boolean | null;
      paymentStatus: string | null;
      oldPaymentStatus: string | null;
    };

type ActivityListener = (event: TenantActivity) => void;
type ReconnectListener = () => void;

export type PresenceSnapshot = {
  /** User ids with at least one open tab. */
  online: ReadonlySet<string>;
  /** userId → conversation id they are currently typing in. */
  typing: ReadonlyMap<string, string>;
};

type PresenceMeta = { userId: string };
type TypingPing = { userId: string; conversationId: string | null };

/** A typing ping lives this long unless refreshed (sender heartbeats every 2.5s). */
const TYPING_TTL_MS = 6_000;
const TYPING_HEARTBEAT_MS = 2_500;

type TenantRealtimeApi = {
  subscribeActivity: (fn: ActivityListener) => () => void;
  /** Fires when the channel re-joins after a drop (not on the first join) —
   *  use it to catch up on events missed while the socket was down. */
  subscribeReconnect: (fn: ReconnectListener) => () => void;
  setTyping: (conversationId: string | null) => void;
};

const ApiContext = createContext<TenantRealtimeApi | null>(null);
const EMPTY_PRESENCE: PresenceSnapshot = { online: new Set(), typing: new Map() };
const PresenceContext = createContext<PresenceSnapshot>(EMPTY_PRESENCE);

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/**
 * Owns the tenant's private realtime channels:
 *  - `tenant:<id>`: `activity` broadcasts (appointments / consultations
 *    pings) + Presence (who is online). Presence is keyed per TAB and
 *    tracked once: realtime-js 2.105 mutates superseded presence metas in
 *    place, so updating a tracked payload leaves stale copies behind (that
 *    is what made "écrit…" stick forever).
 *  - `typing:<id>`: short-lived typing pings, expired locally after 6s
 *    without a heartbeat, so a lost "stopped typing" can never stick.
 * Everything else in the tree subscribes through context, so each topic has
 * exactly one owner (see createTenantChannel).
 */
export function TenantRealtimeProvider({
  tenantId,
  userId,
  children,
}: {
  tenantId: string;
  userId: string;
  children: ReactNode;
}) {
  const activityListeners = useRef(new Set<ActivityListener>());
  const reconnectListeners = useRef(new Set<ReconnectListener>());
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingSentRef = useRef<{ conversationId: string | null; at: number }>({
    conversationId: null,
    at: 0,
  });
  // userId → { conversationId, seen (local clock) }
  const typingSeenRef = useRef(new Map<string, { conversationId: string; seen: number }>());
  const [online, setOnline] = useState<ReadonlySet<string>>(EMPTY_PRESENCE.online);
  const [typing, setTypingState] = useState<ReadonlyMap<string, string>>(EMPTY_PRESENCE.typing);

  const publishTyping = useCallback(() => {
    const now = Date.now();
    const next = new Map<string, string>();
    for (const [uid, t] of typingSeenRef.current) {
      if (now - t.seen < TYPING_TTL_MS) next.set(uid, t.conversationId);
      else typingSeenRef.current.delete(uid);
    }
    setTypingState((prev) => {
      if (prev.size === next.size && [...next].every(([k, v]) => prev.get(k) === v)) return prev;
      return next;
    });
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let typingChannel: RealtimeChannel | null = null;
    let joinedOnce = false;
    const tabKey = `${userId}:${crypto.randomUUID()}`;

    void (async () => {
      await ensureRealtimeAuth(supabase);
      if (cancelled) return;
      channel = createTenantChannel(supabase, `tenant:${tenantId}`, {
        private: true,
        presence: { key: tabKey },
      });
      const ch = channel;
      ch.on('broadcast', { event: 'activity' }, ({ payload }) => {
        for (const fn of activityListeners.current) fn(payload as TenantActivity);
      })
        .on('presence', { event: 'sync' }, () => {
          const state = ch.presenceState<PresenceMeta>();
          const next = new Set<string>();
          for (const [key, metas] of Object.entries(state)) {
            if (metas.length === 0) continue;
            next.add(metas[metas.length - 1]?.userId ?? key.split(':')[0]!);
          }
          setOnline((prev) => (sameSet(prev, next) ? prev : next));
        })
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') return;
          void ch.track({ userId });
          if (joinedOnce) for (const fn of reconnectListeners.current) fn();
          joinedOnce = true;
        });

      typingChannel = createTenantChannel(supabase, `typing:${tenantId}`, { private: true });
      typingChannelRef.current = typingChannel;
      typingChannel
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          const p = payload as TypingPing;
          if (!p?.userId || p.userId === userId) return;
          if (p.conversationId) {
            typingSeenRef.current.set(p.userId, { conversationId: p.conversationId, seen: Date.now() });
          } else {
            typingSeenRef.current.delete(p.userId);
          }
          publishTyping();
        })
        .subscribe();
    })();

    // Expire typing entries whose heartbeat stopped.
    const sweep = setInterval(() => {
      if (typingSeenRef.current.size > 0) publishTyping();
    }, 1_000);

    return () => {
      cancelled = true;
      clearInterval(sweep);
      typingChannelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
      if (typingChannel) void supabase.removeChannel(typingChannel);
    };
  }, [tenantId, userId, publishTyping]);

  const subscribeActivity = useCallback((fn: ActivityListener) => {
    activityListeners.current.add(fn);
    return () => {
      activityListeners.current.delete(fn);
    };
  }, []);

  const subscribeReconnect = useCallback((fn: ReconnectListener) => {
    reconnectListeners.current.add(fn);
    return () => {
      reconnectListeners.current.delete(fn);
    };
  }, []);

  /**
   * Call on every keystroke with the conversation id, and with null when
   * the user stops / sends. Sends at most one ping per 2.5s while typing.
   */
  const setTyping = useCallback(
    (conversationId: string | null) => {
      const last = typingSentRef.current;
      const now = Date.now();
      if (conversationId === last.conversationId) {
        if (conversationId === null || now - last.at < TYPING_HEARTBEAT_MS) return;
      }
      typingSentRef.current = { conversationId, at: now };
      void typingChannelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, conversationId } satisfies TypingPing,
      });
    },
    [userId],
  );

  const presence = useMemo<PresenceSnapshot>(() => ({ online, typing }), [online, typing]);

  const api = useMemo(
    () => ({ subscribeActivity, subscribeReconnect, setTyping }),
    [subscribeActivity, subscribeReconnect, setTyping],
  );

  return (
    <ApiContext.Provider value={api}>
      <PresenceContext.Provider value={presence}>{children}</PresenceContext.Provider>
    </ApiContext.Provider>
  );
}

function useApi(): TenantRealtimeApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('TenantRealtimeProvider is missing');
  return api;
}

/** Subscribe to tenant activity pings. `handler` may change between renders. */
export function useTenantActivity(handler: ActivityListener): void {
  const { subscribeActivity } = useApi();
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => subscribeActivity((e) => ref.current(e)), [subscribeActivity]);
}

/** Called when the channel re-joins after a connection drop. */
export function useRealtimeReconnect(handler: ReconnectListener): void {
  const { subscribeReconnect } = useApi();
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => subscribeReconnect(() => ref.current()), [subscribeReconnect]);
}

export function usePresence(): PresenceSnapshot {
  return useContext(PresenceContext);
}

export function useSetTyping(): (conversationId: string | null) => void {
  return useApi().setTyping;
}
