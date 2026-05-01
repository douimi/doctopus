import { describe, expect, it } from 'vitest';
import { sectionsUpdateSchema, vitalsUpdateSchema } from '@/lib/consultations/schemas';

describe('consultation schemas', () => {
  it('sectionsUpdateSchema accepts empty strings', () => {
    expect(() =>
      sectionsUpdateSchema.parse({
        motif: '',
        historyNotes: '',
        examNotes: '',
        diagnosis: '',
        followUpNotes: '',
      }),
    ).not.toThrow();
  });

  it('sectionsUpdateSchema accepts long text', () => {
    const long = 'x'.repeat(5000);
    expect(() =>
      sectionsUpdateSchema.parse({
        motif: long,
        historyNotes: '',
        examNotes: '',
        diagnosis: '',
        followUpNotes: '',
      }),
    ).not.toThrow();
  });

  it('sectionsUpdateSchema rejects > 10000 chars per field', () => {
    const huge = 'x'.repeat(10001);
    expect(() =>
      sectionsUpdateSchema.parse({
        motif: huge,
        historyNotes: '',
        examNotes: '',
        diagnosis: '',
        followUpNotes: '',
      }),
    ).toThrow();
  });

  it('vitalsUpdateSchema accepts numeric strings', () => {
    expect(() =>
      vitalsUpdateSchema.parse({
        weightKg: '70.5',
        heightCm: '175',
        temperatureC: '37.2',
        bpSystolic: '120',
        bpDiastolic: '80',
        heartRate: '70',
        notes: '',
      }),
    ).not.toThrow();
  });

  it('vitalsUpdateSchema accepts empty strings (means null)', () => {
    expect(() =>
      vitalsUpdateSchema.parse({
        weightKg: '',
        heightCm: '',
        temperatureC: '',
        bpSystolic: '',
        bpDiastolic: '',
        heartRate: '',
        notes: '',
      }),
    ).not.toThrow();
  });

  it('vitalsUpdateSchema rejects non-numeric weight', () => {
    expect(() =>
      vitalsUpdateSchema.parse({
        weightKg: 'abc',
        heightCm: '',
        temperatureC: '',
        bpSystolic: '',
        bpDiastolic: '',
        heartRate: '',
        notes: '',
      }),
    ).toThrow();
  });

  it('vitalsUpdateSchema rejects negative BP', () => {
    expect(() =>
      vitalsUpdateSchema.parse({
        weightKg: '',
        heightCm: '',
        temperatureC: '',
        bpSystolic: '-10',
        bpDiastolic: '',
        heartRate: '',
        notes: '',
      }),
    ).toThrow();
  });
});
