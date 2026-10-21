import { describe, expect, it } from 'vitest';
import {
  APPOINTMENT_STATUS_LABEL,
  appointmentStatus,
  consultationStatus,
  paymentStatus,
} from '@/lib/status-labels';

describe('status labels', () => {
  it('uses one vocabulary for appointments', () => {
    expect(Object.values(APPOINTMENT_STATUS_LABEL)).toEqual([
      'Prévu',
      'En attente',
      'En consultation',
      'Terminé',
      'Annulé',
      'Absent',
    ]);
  });

  it('distinguishes scheduled (neutral) from in-consultation (info)', () => {
    expect(appointmentStatus('scheduled').tone).toBe('neutral');
    expect(appointmentStatus('in_consultation').tone).toBe('info');
    expect(appointmentStatus('no_show')).toEqual({ label: 'Absent', tone: 'danger' });
  });

  it('falls back safely on unknown values', () => {
    expect(appointmentStatus('bogus').label).toBe('Prévu');
    expect(appointmentStatus(null).label).toBe('Prévu');
    expect(paymentStatus(undefined).label).toBe('En attente');
  });

  it('labels consultations and payments', () => {
    expect(consultationStatus(true)).toEqual({ label: 'Clôturée', tone: 'success' });
    expect(consultationStatus(false).label).toBe('En cours');
    expect(paymentStatus('paid').label).toBe('Payé');
    expect(paymentStatus('free').label).toBe('Gratuit');
  });
});
