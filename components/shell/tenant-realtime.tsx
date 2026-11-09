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

type PresenceMeta = { userId: string; typingIn: string | null };

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

/**
 * Owns the single private `tenant:<id>` realtime channel:
 *  - `activity` broadcasts (appointments / consultations pings)
 *  - Presence: who is online, who is typing where.
 * Everything else in the tree subscribes through context, so the topic has
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
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingRef = useRef<string | null>(null);
  const [presence, setPresence] = useState<PresenceSnapshot>(EMPTY_PRESENCE);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let joinedOnce = false;

    void (async () => {
      await ensureRealtimeAuth(supabase);
      if (cancelled) return;
      channel = createTenantChannel(supabase, `tenant:${tenantId}`, {
        private: true,
        presence: { key: userId },
      });
      channelRef.current = channel;
      const ch = channel;
      ch.on('broadcast', { event: 'activity' }, ({ payload }) => {
        for (const fn of activityListeners.current) fn(payload as TenantActivity);
      })
        .on('presence', { event: 'sync' }, () => {
          const state = ch.presenceState<PresenceMeta>();
          const online = new Set<string>();
          const typing = new Map<string, string>();
          for (const [key, metas] of Object.entries(state)) {
            if (metas.length === 0) continue;
            online.add(key);
            const t = metas.find((m) => m.typingIn)?.typingIn;
            if (t) typing.set(key, t);
          }
          setPresence({ online, typing });
        })
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') return;
          void ch.track({ userId, typingIn: typingRef.current });
          if (joinedOnce) for (const fn of reconnectListeners.current) fn();
          joinedOnce = true;
        });
    })();

    return () => {
      cancelled = true;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [tenantId, userId]);

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

  const setTyping = useCallback(
    (conversationId: string | null) => {
      if (typingRef.current === conversationId) return;
      typingRef.current = conversationId;
      void channelRef.current?.track({ userId, typingIn: conversationId });
    },
    [userId],
  );

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
