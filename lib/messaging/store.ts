import type {
  ChatMessage,
  ConversationRef,
  ConversationSummary,
  MessagePage,
  MessagingBootstrap,
  TeamMember,
} from './types';

/**
 * Pure client state for cabinet messaging. Kept framework-free so the
 * merge / dedupe / unread rules are unit-tested (tests/unit/messaging).
 */

export type ThreadState = {
  messages: ChatMessage[];
  hasMore: boolean;
  loaded: boolean;
};

export type MessagingState = {
  ready: boolean;
  me: TeamMember | null;
  team: TeamMember[];
  conversations: Record<string, ConversationSummary>;
  threads: Record<string, ThreadState>;
};

export const initialMessagingState: MessagingState = {
  ready: false,
  me: null,
  team: [],
  conversations: {},
  threads: {},
};

export type MessagingAction =
  | { type: 'bootstrap'; data: MessagingBootstrap }
  | { type: 'conversationUpserted'; conversation: ConversationSummary }
  | {
      type: 'messageReceived';
      message: ChatMessage;
      conversation?: ConversationRef;
      /** Realtime echo of a new message → may bump unread. */
      live: boolean;
    }
  | { type: 'messagesMerged'; messages: ChatMessage[] }
  | { type: 'threadLoaded'; conversationId: string; page: MessagePage; mode: 'latest' | 'older' }
  | { type: 'optimisticAdded'; message: ChatMessage }
  | { type: 'sendSucceeded'; message: ChatMessage }
  | { type: 'sendFailed'; conversationId: string; id: string }
  | { type: 'readReceived'; conversationId: string; userId: string; lastReadAt: string }
  | { type: 'markedRead'; conversationId: string }
  | { type: 'mutedChanged'; conversationId: string; muted: boolean };

function byTime(a: ChatMessage, b: ChatMessage): number {
  const d = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  return d !== 0 ? d : a.id.localeCompare(b.id);
}

/** Union by id; a confirmed (non-pending) copy always wins over a pending one. */
export function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map(existing.map((m) => [m.id, m]));
  for (const m of incoming) {
    const cur = map.get(m.id);
    if (cur && !cur.pending && m.pending) continue;
    map.set(m.id, m);
  }
  return [...map.values()].sort(byTime);
}

function laterIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

function withLastMessage(conv: ConversationSummary, m: ChatMessage): ConversationSummary {
  const cur = conv.lastMessage;
  if (cur && cur.id !== m.id && byTime(cur, m) > 0) return conv;
  return { ...conv, lastMessage: m, lastMessageAt: laterIso(conv.lastMessageAt, m.createdAt) };
}

function emptyConversation(ref: ConversationRef): ConversationSummary {
  return { ...ref, lastMessage: null, lastMessageAt: null, unread: 0, muted: false, reads: {} };
}

function isKnown(state: MessagingState, m: ChatMessage): boolean {
  const thread = state.threads[m.conversationId];
  if (thread?.messages.some((x) => x.id === m.id)) return true;
  return state.conversations[m.conversationId]?.lastMessage?.id === m.id;
}

function applyMessage(
  state: MessagingState,
  m: ChatMessage,
  opts: { live: boolean; conversation?: ConversationRef },
): MessagingState {
  let conv = state.conversations[m.conversationId];
  if (!conv) {
    if (!opts.conversation) return state; // unknown thread, wait for bootstrap
    conv = emptyConversation(opts.conversation);
  }
  const known = isKnown(state, m);
  const fromOther = state.me !== null && m.senderId !== state.me.id;
  conv = withLastMessage(conv, m);
  if (opts.live && !known && fromOther && !m.deletedAt) {
    conv = { ...conv, unread: conv.unread + 1 };
  }
  const thread = state.threads[m.conversationId];
  return {
    ...state,
    conversations: { ...state.conversations, [conv.id]: conv },
    threads: thread
      ? {
          ...state.threads,
          [m.conversationId]: { ...thread, messages: mergeMessages(thread.messages, [m]) },
        }
      : state.threads,
  };
}

export function messagingReducer(state: MessagingState, action: MessagingAction): MessagingState {
  switch (action.type) {
    case 'bootstrap': {
      const conversations: Record<string, ConversationSummary> = {};
      for (const c of action.data.conversations) {
        // Keep a newer last message we may already hold from realtime.
        const prev = state.conversations[c.id];
        conversations[c.id] =
          prev?.lastMessage && (!c.lastMessage || byTime(prev.lastMessage, c.lastMessage) > 0)
            ? { ...c, lastMessage: prev.lastMessage, lastMessageAt: prev.lastMessageAt }
            : c;
      }
      return {
        ...state,
        ready: true,
        me: action.data.me,
        team: action.data.team,
        conversations,
      };
    }
    case 'conversationUpserted': {
      const prev = state.conversations[action.conversation.id];
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [action.conversation.id]: prev ?? action.conversation,
        },
      };
    }
    case 'messageReceived':
      return applyMessage(state, action.message, {
        live: action.live,
        conversation: action.conversation,
      });
    case 'messagesMerged': {
      let next = state;
      for (const m of action.messages) next = applyMessage(next, m, { live: false });
      return next;
    }
    case 'threadLoaded': {
      const prev = state.threads[action.conversationId];
      const messages =
        action.mode === 'older'
          ? mergeMessages(prev?.messages ?? [], action.page.messages)
          : mergeMessages(
              // Keep pending sends and anything newer than the fetched page.
              prev?.messages ?? [],
              action.page.messages,
            );
      const hasMore =
        action.mode === 'older' ? action.page.hasMore : prev?.loaded ? prev.hasMore : action.page.hasMore;
      return {
        ...state,
        threads: {
          ...state.threads,
          [action.conversationId]: { messages, hasMore, loaded: true },
        },
      };
    }
    case 'optimisticAdded':
      return applyMessage(state, action.message, { live: false });
    case 'sendSucceeded':
      return applyMessage(state, action.message, { live: false });
    case 'sendFailed': {
      const thread = state.threads[action.conversationId];
      if (!thread) return state;
      return {
        ...state,
        threads: {
          ...state.threads,
          [action.conversationId]: {
            ...thread,
            messages: thread.messages.map((m) =>
              m.id === action.id && m.pending ? { ...m, pending: 'failed' as const } : m,
            ),
          },
        },
      };
    }
    case 'readReceived': {
      const conv = state.conversations[action.conversationId];
      if (!conv) return state;
      const reads = {
        ...conv.reads,
        [action.userId]: laterIso(conv.reads[action.userId] ?? null, action.lastReadAt)!,
      };
      const unread = state.me && action.userId === state.me.id ? 0 : conv.unread;
      return {
        ...state,
        conversations: { ...state.conversations, [conv.id]: { ...conv, reads, unread } },
      };
    }
    case 'markedRead': {
      const conv = state.conversations[action.conversationId];
      if (!conv || conv.unread === 0) return state;
      return {
        ...state,
        conversations: { ...state.conversations, [conv.id]: { ...conv, unread: 0 } },
      };
    }
    case 'mutedChanged': {
      const conv = state.conversations[action.conversationId];
      if (!conv) return state;
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [conv.id]: { ...conv, muted: action.muted },
        },
      };
    }
  }
}

export function totalUnread(state: MessagingState): number {
  let n = 0;
  for (const c of Object.values(state.conversations)) n += c.unread;
  return n;
}

/** Latest createdAt the client has seen — the catch-up cursor. */
export function latestSeen(state: MessagingState): string | null {
  let best: string | null = null;
  for (const c of Object.values(state.conversations)) {
    if (c.lastMessage && !c.lastMessage.pending) best = laterIso(best, c.lastMessage.createdAt);
  }
  return best;
}

export function cabinetConversation(state: MessagingState): ConversationSummary | null {
  return Object.values(state.conversations).find((c) => c.kind === 'cabinet') ?? null;
}

export function directConversationWith(
  state: MessagingState,
  peerId: string,
): ConversationSummary | null {
  return (
    Object.values(state.conversations).find(
      (c) => c.kind === 'direct' && (c.userA === peerId || c.userB === peerId),
    ) ?? null
  );
}
