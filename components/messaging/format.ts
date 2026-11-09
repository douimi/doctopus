import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  displayName,
  isImageMime,
  peerOf,
  shortName,
  type ChatMessage,
  type ConversationRef,
  type TeamMember,
} from '@/lib/messaging/types';

export const CABINET_TITLE = 'Cabinet';

function member(team: TeamMember[], id: string | null): TeamMember | null {
  if (!id) return null;
  return team.find((m) => m.id === id) ?? null;
}

/** "Dr Karim Alaoui" / "Salma Tazi". */
export function memberName(team: TeamMember[], id: string | null): string {
  return displayName(member(team, id));
}

/** "Dr Alaoui" / "Salma" — typing line, read receipts, previews. */
export function memberShortName(team: TeamMember[], id: string | null): string {
  return shortName(member(team, id));
}

export function conversationTitle(conv: ConversationRef, me: string, team: TeamMember[]): string {
  if (conv.kind === 'cabinet') return CABINET_TITLE;
  return memberName(team, peerOf(conv, me));
}

export function roleLabel(role: TeamMember['role']): string {
  return role === 'doctor' ? 'Médecin' : 'Assistant(e)';
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

export function formatDuration(ms: number | null): string {
  const total = Math.max(0, Math.round((ms ?? 0) / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function messagePreview(m: ChatMessage): string {
  if (m.deletedAt) return 'Message supprimé';
  const about = m.patientName ? ` · ${m.patientName}` : '';
  switch (m.kind) {
    case 'voice':
      return `Note vocale (${formatDuration(m.voiceDurationMs)})${about}`;
    case 'attachment': {
      const what = isImageMime(m.attachmentMime) ? 'Photo' : (m.attachmentName ?? 'Fichier');
      const caption = m.body ? ` · ${m.body.replace(/\s+/g, ' ').trim()}` : '';
      return `📎 ${what}${caption}${about}`;
    }
    default: {
      const text = (m.body ?? '').replace(/\s+/g, ' ').trim();
      if (!text && m.patientName) return `Patient : ${m.patientName}`;
      return `${text}${about}`;
    }
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

const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  scheduled: 'RDV prévu',
  waiting: 'En salle d’attente',
  in_consultation: 'En consultation',
  done: 'Consultation terminée',
  cancelled: 'RDV annulé',
  no_show: 'Absent',
};

export function appointmentStatusLabel(status: string | null): string | null {
  return status ? (APPOINTMENT_STATUS_LABEL[status] ?? null) : null;
}
