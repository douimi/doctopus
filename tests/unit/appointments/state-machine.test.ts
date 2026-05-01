import { describe, expect, it } from 'vitest';
import { canTransition, applyTransition } from '@/lib/appointments/state-machine';

describe('appointment state machine', () => {
  describe('canTransition', () => {
    it('scheduled → waiting via "arrive"', () => {
      expect(canTransition('scheduled', 'arrive')).toBe(true);
    });
    it('waiting → in_consultation via "start"', () => {
      expect(canTransition('waiting', 'start')).toBe(true);
    });
    it('in_consultation → done via "finalize"', () => {
      expect(canTransition('in_consultation', 'finalize')).toBe(true);
    });
    it('scheduled → cancelled via "cancel"', () => {
      expect(canTransition('scheduled', 'cancel')).toBe(true);
    });
    it('waiting → cancelled via "cancel"', () => {
      expect(canTransition('waiting', 'cancel')).toBe(true);
    });
    it('scheduled → no_show via "noShow"', () => {
      expect(canTransition('scheduled', 'noShow')).toBe(true);
    });
    it('done → anything blocked', () => {
      expect(canTransition('done', 'cancel')).toBe(false);
      expect(canTransition('done', 'arrive')).toBe(false);
    });
    it('cancelled → anything blocked', () => {
      expect(canTransition('cancelled', 'arrive')).toBe(false);
    });
    it('no_show → anything blocked', () => {
      expect(canTransition('no_show', 'arrive')).toBe(false);
    });
    it('in_consultation cannot cancel', () => {
      expect(canTransition('in_consultation', 'cancel')).toBe(false);
    });
  });

  describe('applyTransition', () => {
    it('arrive sets arrivedAt', () => {
      const now = new Date('2026-05-01T09:00:00Z');
      expect(applyTransition('scheduled', 'arrive', now)).toEqual({
        status: 'waiting',
        arrivedAt: now,
      });
    });
    it('start sets startedAt', () => {
      const now = new Date('2026-05-01T09:30:00Z');
      expect(applyTransition('waiting', 'start', now)).toEqual({
        status: 'in_consultation',
        startedAt: now,
      });
    });
    it('finalize sets endedAt', () => {
      const now = new Date('2026-05-01T09:45:00Z');
      expect(applyTransition('in_consultation', 'finalize', now)).toEqual({
        status: 'done',
        endedAt: now,
      });
    });
    it('cancel just sets status', () => {
      expect(applyTransition('scheduled', 'cancel', new Date())).toEqual({
        status: 'cancelled',
      });
    });
    it('noShow just sets status', () => {
      expect(applyTransition('scheduled', 'noShow', new Date())).toEqual({
        status: 'no_show',
      });
    });
    it('throws when transition not allowed', () => {
      expect(() => applyTransition('done', 'arrive', new Date())).toThrow(/not allowed/i);
    });
  });
});
