/**
 * Single source of truth for the status vocabulary shown in the UI
 * (UX brief §4 "Status labels"). Every badge that renders an appointment,
 * consultation or payment status reads from here so "Terminé",
 * "Terminée" and "Finalisé" can't drift apart again.
 *
 * Appointments are masculine (« un rendez-vous ») → "Terminé", "Annulé".
 * Consultations are feminine (« une consultation ») → "Clôturée".
 */

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type AppointmentStatus =
  | 'scheduled'
  | 'waiting'
  | 'in_consultation'
  | 'done'
  | 'cancelled'
  | 'no_show';

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: 'Prévu',
  waiting: 'En attente',
  in_consultation: 'En consultation',
  done: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absent',
};

// Per ui-spec §2.3: scheduled is neutral and in_consultation is info so
// the two states read differently in the agenda.
export const APPOINTMENT_STATUS_TONE: Record<AppointmentStatus, BadgeTone> = {
  scheduled: 'neutral',
  waiting: 'warning',
  in_consultation: 'info',
  done: 'success',
  cancelled: 'neutral',
  no_show: 'danger',
};

export type AppointmentKind = 'scheduled' | 'walkin';

export const APPOINTMENT_KIND_LABEL: Record<AppointmentKind, string> = {
  scheduled: 'Sur RDV',
  walkin: 'Sans RDV',
};

export type ConsultationState = 'draft' | 'finalized';

export const CONSULTATION_STATUS_LABEL: Record<ConsultationState, string> = {
  draft: 'En cours',
  finalized: 'Clôturée',
};

export const CONSULTATION_STATUS_TONE: Record<ConsultationState, BadgeTone> = {
  draft: 'warning',
  finalized: 'success',
};

export type PaymentStatus = 'awaiting' | 'paid' | 'free';

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  awaiting: 'En attente',
  paid: 'Payé',
  free: 'Gratuit',
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  awaiting: 'warning',
  paid: 'success',
  free: 'neutral',
};

function isKey<T extends string>(map: Record<T, unknown>, key: string): key is T {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/** Label + tone for a raw appointment status string (unknown → "Prévu"). */
export function appointmentStatus(status: string | null | undefined): {
  label: string;
  tone: BadgeTone;
} {
  const key: AppointmentStatus =
    status && isKey(APPOINTMENT_STATUS_LABEL, status) ? status : 'scheduled';
  return { label: APPOINTMENT_STATUS_LABEL[key], tone: APPOINTMENT_STATUS_TONE[key] };
}

export function consultationStatus(isFinalized: boolean): { label: string; tone: BadgeTone } {
  const key: ConsultationState = isFinalized ? 'finalized' : 'draft';
  return { label: CONSULTATION_STATUS_LABEL[key], tone: CONSULTATION_STATUS_TONE[key] };
}

export function paymentStatus(status: string | null | undefined): {
  label: string;
  tone: BadgeTone;
} {
  const key: PaymentStatus = status && isKey(PAYMENT_STATUS_LABEL, status) ? status : 'awaiting';
  return { label: PAYMENT_STATUS_LABEL[key], tone: PAYMENT_STATUS_TONE[key] };
}
