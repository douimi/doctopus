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
  /** "Nom Prénom" of the linked patient (joined server-side). */
  patientName: string | null;
  appointmentId: string | null;
  /** Status of the linked appointment when fetched; live updates come from tenant activity. */
  appointmentStatus: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  attachmentBytes: number | null;
  voiceDurationMs: number | null;
  /** ISO timestamp. */
  createdAt: string;
  deletedAt: string | null;
  /** Client-only: optimistic send state. */
  pending?: 'sending' | 'failed';
  /** Client-only: object URL of a file being sent (preview before upload). */
  localUrl?: string;
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

export type QuickReply = { id: string; label: string; body: string; sortOrder: number };

export type MessagingBootstrap = {
  me: TeamMember;
  team: TeamMember[];
  conversations: ConversationSummary[];
  quickReplies: QuickReply[];
};

/** Patient attached to a message being composed. */
export type PatientRef = { id: string; name: string };

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const VOICE_MAX_MS = 2 * 60 * 1000;
export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const DOC_MIMES = ['application/pdf'] as const;
export const AUDIO_MIMES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac'] as const;
export const ATTACHMENT_MIMES: readonly string[] = [...IMAGE_MIMES, ...DOC_MIMES, ...AUDIO_MIMES];

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/aac': 'aac',
};

/** "audio/webm;codecs=opus" → "audio/webm". */
export function baseMime(mime: string): string {
  return mime.split(';')[0]!.trim().toLowerCase();
}

export function extensionFor(mime: string): string | null {
  return EXT[baseMime(mime)] ?? null;
}

export function isImageMime(mime: string | null): boolean {
  return !!mime && (IMAGE_MIMES as readonly string[]).includes(baseMime(mime));
}

/** Display name: doctors get a "Dr" prefix unless they already have one. */
export function displayName(member: Pick<TeamMember, 'fullName' | 'role'> | null | undefined): string {
  if (!member) return 'Ancien membre';
  const name = member.fullName.trim();
  if (member.role !== 'doctor') return name;
  return /^(dr\.?|docteur)\s/i.test(name) ? name : `Dr ${name}`;
}

/** Short form for tight UI ("Dr Alaoui écrit…", "Salma écrit…"). */
export function shortName(member: Pick<TeamMember, 'fullName' | 'role'> | null | undefined): string {
  if (!member) return 'Quelqu’un';
  const name = member.fullName.trim().replace(/^(dr\.?|docteur)\s+/i, '');
  const parts = name.split(/\s+/).filter(Boolean);
  if (member.role === 'doctor') return `Dr ${parts.length > 1 ? parts.slice(1).join(' ') : name}`;
  return parts[0] ?? name;
}

export type MessagePage = { messages: ChatMessage[]; hasMore: boolean };

export const MESSAGE_PAGE_SIZE = 50;
export const MESSAGE_MAX_LENGTH = 4000;
export const DELETE_WINDOW_MS = 15 * 60 * 1000;

/** The other participant of a direct conversation. */
export function peerOf(conv: ConversationRef, me: string): string | null {
  if (conv.kind !== 'direct') return null;
  return conv.userA === me ? conv.userB : conv.userA;
}
