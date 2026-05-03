import type { Event } from '@sentry/nextjs';

const SENSITIVE_KEYS = new Set([
  'firstName',
  'first_name',
  'lastName',
  'last_name',
  'fullName',
  'full_name',
  'cin',
  'phone',
  'email',
  'address',
  'notes',
  'motif',
  'historyNotes',
  'history_notes',
  'examNotes',
  'exam_notes',
  'diagnosis',
  'followUpNotes',
  'follow_up_notes',
  'medicationLabelSnapshot',
  'medication_label_snapshot',
  'posologie',
  'instructions',
  'reason',
  'password',
]);

const CIN_RE = /\b[A-Z]{1,2}\d{2,8}\b/g;
const PHONE_RE = /\+?212\d{9}|\+?\d{10,14}/g;

function scrubString(s: string): string {
  return s.replace(CIN_RE, '[CIN]').replace(PHONE_RE, '[PHONE]');
}

function eventContainsSensitive(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) return obj.some(eventContainsSensitive);
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) return true;
  }
  return false;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = '[scrubbed]';
    } else if (typeof v === 'string') {
      out[k] = scrubString(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function scrubEvent(ev: Event): Event | null {
  if (ev.extra && eventContainsSensitive(ev.extra)) return null;

  const out: Event = { ...ev };

  if (typeof out.message === 'string') {
    out.message = scrubString(out.message);
  }

  if (out.request && typeof out.request === 'object') {
    const req = { ...out.request };
    if (req.data && typeof req.data === 'object' && !Array.isArray(req.data)) {
      req.data = redactObject(req.data as Record<string, unknown>);
    }
    out.request = req;
  }

  if (Array.isArray(out.breadcrumbs)) {
    out.breadcrumbs = out.breadcrumbs.map((bc) => {
      const copy = { ...bc };
      if (typeof copy.message === 'string') {
        copy.message = scrubString(copy.message);
      }
      if (copy.data && typeof copy.data === 'object' && !Array.isArray(copy.data)) {
        copy.data = redactObject(copy.data as Record<string, unknown>);
      }
      return copy;
    });
  }

  return out;
}
