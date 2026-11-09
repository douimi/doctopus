/**
 * Shared (client + server) shapes for cabinet messaging. Realtime payloads
 * built by the SQL triggers in migration 0020 use the same camelCase keys.
 */

export type MessageKind = 'text' | 'quick' | 'attachment' | 'voice';

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  kind: MessageKind;
  body: string | null;
  patientId: string | null;
  appointmentId: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  attachmentBytes: number | null;
  voiceDurationMs: number | null;
  /** ISO timestamp. */
  createdAt: string;
  deletedAt: string | null;
  /** Client-only: optimistic send state. */
  pending?: 'sending' | 'failed';
};

export type TeamMember = {
  id: string;
  fullName: string;
  role: 'doctor' | 'assistant';
  /** Deactivated members keep their history but can't be messaged. */
  active: boolean;
};

export type ConversationRef = {
  id: string;
  kind: 'cabinet' | 'direct';
  userA: string | null;
  userB: string | null;
};

export type ConversationSummary = ConversationRef & {
  lastMessage: ChatMessage | null;
  lastMessageAt: string | null;
  unread: number;
  muted: boolean;
  /** userId → ISO last_read_at, for read ticks. */
  reads: Record<string, string>;
};

export type MessagingBootstrap = {
  me: TeamMember;
  team: TeamMember[];
  conversations: ConversationSummary[];
};

export type MessagePage = { messages: ChatMessage[]; hasMore: boolean };

export const MESSAGE_PAGE_SIZE = 50;
export const MESSAGE_MAX_LENGTH = 4000;
export const DELETE_WINDOW_MS = 15 * 60 * 1000;

/** The other participant of a direct conversation. */
export function peerOf(conv: ConversationRef, me: string): string | null {
  if (conv.kind !== 'direct') return null;
  return conv.userA === me ? conv.userB : conv.userA;
}
