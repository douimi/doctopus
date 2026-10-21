/**
 * Result of the booking / walk-in form actions. `at` changes on every
 * submission so the client can react once per result (close the dialog,
 * toast) even when two submissions return the same payload.
 */
export type BookState = {
  ok?: boolean;
  error: string | null;
  at?: number;
  patientName?: string;
  /** Human summary of the booked slot, e.g. "mardi 21 octobre à 10:30". */
  when?: string;
};

export type WalkInState = {
  ok?: boolean;
  error: string | null;
  at?: number;
  patientName?: string;
};
