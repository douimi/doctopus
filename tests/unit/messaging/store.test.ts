import { describe, expect, it } from 'vitest';
import {
  initialMessagingState,
  latestSeen,
  mergeMessages,
  messagingReducer,
  totalUnread,
  type MessagingState,
} from '@/lib/messaging/store';
import type { ChatMessage, ConversationSummary, MessagingBootstrap } from '@/lib/messaging/types';

const ME = '00000000-0000-4000-8000-000000000001';
const PEER = '00000000-0000-4000-8000-000000000002';
const CAB = '10000000-0000-4000-8000-000000000000';

function msg(id: string, at: string, over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    conversationId: CAB,
    senderId: PEER,
    senderName: 'Peer',
    kind: 'text',
    body: `m${id}`,
    patientId: null,
    appointmentId: null,
    attachmentName: null,
    attachmentMime: null,
    attachmentBytes: null,
    voiceDurationMs: null,
    createdAt: at,
    deletedAt: null,
    ...over,
  };
}

const cabinet: ConversationSummary = {
  id: CAB,
  kind: 'cabinet',
  userA: null,
  userB: null,
  lastMessage: null,
  lastMessageAt: null,
  unread: 0,
  muted: false,
  reads: {},
};

function booted(over: Partial<ConversationSummary> = {}): MessagingState {
  const data: MessagingBootstrap = {
    me: { id: ME, fullName: 'Me', role: 'doctor', active: true },
    team: [
      { id: ME, fullName: 'Me', role: 'doctor', active: true },
      { id: PEER, fullName: 'Peer', role: 'assistant', active: true },
    ],
    conversations: [{ ...cabinet, ...over }],
  };
  return messagingReducer(initialMessagingState, { type: 'bootstrap', data });
}

describe('messaging store', () => {
  it('mergeMessages sorts by time and lets a confirmed copy beat a pending one', () => {
    const pending = msg('b', '2026-01-01T10:00:05Z', { pending: 'sending', senderId: ME });
    const confirmed = msg('b', '2026-01-01T10:00:02Z', { senderId: ME });
    const out = mergeMessages([msg('a', '2026-01-01T10:00:00Z'), pending], [confirmed]);
    expect(out.map((m) => m.id)).toEqual(['a', 'b']);
    expect(out[1]!.pending).toBeUndefined();
    // A late pending copy never overwrites the confirmed one.
    expect(mergeMessages(out, [pending])[1]!.pending).toBeUndefined();
  });

  it('counts a live message from someone else once, even if echoed twice', () => {
    let s = booted();
    const m = msg('x', '2026-01-01T10:00:00Z');
    s = messagingReducer(s, { type: 'messageReceived', message: m, live: true });
    s = messagingReducer(s, { type: 'messageReceived', message: m, live: true });
    expect(s.conversations[CAB]!.unread).toBe(1);
    expect(s.conversations[CAB]!.lastMessage?.id).toBe('x');
    expect(totalUnread(s)).toBe(1);
  });

  it('never counts my own messages or catch-up merges as unread', () => {
    let s = booted();
    s = messagingReducer(s, {
      type: 'messageReceived',
      message: msg('mine', '2026-01-01T10:00:00Z', { senderId: ME }),
      live: true,
    });
    s = messagingReducer(s, {
      type: 'messagesMerged',
      messages: [msg('old', '2026-01-01T09:00:00Z')],
    });
    expect(s.conversations[CAB]!.unread).toBe(0);
    // An older catch-up message doesn't replace the newer preview.
    expect(s.conversations[CAB]!.lastMessage?.id).toBe('mine');
  });

  it('creates a conversation it did not know from the realtime ref', () => {
    let s = booted();
    const DM = '20000000-0000-4000-8000-000000000000';
    s = messagingReducer(s, {
      type: 'messageReceived',
      message: msg('d1', '2026-01-01T10:00:00Z', { conversationId: DM }),
      conversation: { id: DM, kind: 'direct', userA: ME, userB: PEER },
      live: true,
    });
    expect(s.conversations[DM]).toMatchObject({ kind: 'direct', unread: 1 });
  });

  it('optimistic send → failure → retry success', () => {
    let s = booted();
    s = messagingReducer(s, {
      type: 'threadLoaded',
      conversationId: CAB,
      page: { messages: [], hasMore: false },
      mode: 'latest',
    });
    const draft = msg('o1', '2026-01-01T10:00:00Z', { senderId: ME, pending: 'sending' });
    s = messagingReducer(s, { type: 'optimisticAdded', message: draft });
    s = messagingReducer(s, { type: 'sendFailed', conversationId: CAB, id: 'o1' });
    expect(s.threads[CAB]!.messages[0]!.pending).toBe('failed');
    s = messagingReducer(s, {
      type: 'sendSucceeded',
      message: msg('o1', '2026-01-01T10:00:01Z', { senderId: ME }),
    });
    expect(s.threads[CAB]!.messages).toHaveLength(1);
    expect(s.threads[CAB]!.messages[0]!.pending).toBeUndefined();
    expect(latestSeen(s)).toBe('2026-01-01T10:00:01Z');
  });

  it('my own read receipt (other tab) clears unread; a peer receipt only updates reads', () => {
    let s = booted({ unread: 3 });
    s = messagingReducer(s, {
      type: 'readReceived',
      conversationId: CAB,
      userId: PEER,
      lastReadAt: '2026-01-01T10:00:00Z',
    });
    expect(s.conversations[CAB]!.unread).toBe(3);
    expect(s.conversations[CAB]!.reads[PEER]).toBe('2026-01-01T10:00:00Z');
    s = messagingReducer(s, {
      type: 'readReceived',
      conversationId: CAB,
      userId: ME,
      lastReadAt: '2026-01-01T10:00:00Z',
    });
    expect(s.conversations[CAB]!.unread).toBe(0);
  });

  it('older pages prepend without losing newer live messages', () => {
    let s = booted();
    s = messagingReducer(s, {
      type: 'threadLoaded',
      conversationId: CAB,
      page: { messages: [msg('n1', '2026-01-02T10:00:00Z')], hasMore: true },
      mode: 'latest',
    });
    s = messagingReducer(s, {
      type: 'messageReceived',
      message: msg('n2', '2026-01-02T11:00:00Z'),
      live: true,
    });
    s = messagingReducer(s, {
      type: 'threadLoaded',
      conversationId: CAB,
      page: { messages: [msg('o1', '2026-01-01T10:00:00Z')], hasMore: false },
      mode: 'older',
    });
    expect(s.threads[CAB]!.messages.map((m) => m.id)).toEqual(['o1', 'n1', 'n2']);
    expect(s.threads[CAB]!.hasMore).toBe(false);
  });
});
