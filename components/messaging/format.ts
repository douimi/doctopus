import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { peerOf, type ChatMessage, type ConversationRef, type TeamMember } from '@/lib/messaging/types';

export const CABINET_TITLE = 'Cabinet';

export function memberName(team: TeamMember[], id: string | null): string {
  if (!id) return 'Membre';
  return team.find((m) => m.id === id)?.fullName ?? 'Ancien membre';
}

export function conversationTitle(conv: ConversationRef, me: string, team: TeamMember[]): string {
  if (conv.kind === 'cabinet') return CABINET_TITLE;
  return memberName(team, peerOf(conv, me));
}

export function roleLabel(role: TeamMember['role']): string {
  return role === 'doctor' ? 'Médecin' : 'Assistant(e)';
}

export function messagePreview(m: ChatMessage): string {
  if (m.deletedAt) return 'Message supprimé';
  switch (m.kind) {
    case 'voice':
      return 'Note vocale';
    case 'attachment':
      return m.attachmentName ? `Pièce jointe · ${m.attachmentName}` : 'Pièce jointe';
    default:
      return (m.body ?? '').replace(/\s+/g, ' ').trim();
  }
}

/** "14:32" today, "Hier", "lun.", or "12/03". */
export function listTime(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Hier';
  if (Date.now() - d.getTime() < 6 * 24 * 3600 * 1000) return format(d, 'EEE', { locale: fr });
  return format(d, 'dd/MM');
}

export function bubbleTime(isoString: string): string {
  return format(new Date(isoString), 'HH:mm');
}

export function daySeparator(isoString: string): string {
  const d = new Date(isoString);
  if (isToday(d)) return "Aujourd'hui";
  if (isYesterday(d)) return 'Hier';
  return format(d, 'EEEE d MMMM', { locale: fr });
}

export function sameDay(a: string, b: string): boolean {
  return isSameDay(new Date(a), new Date(b));
}
