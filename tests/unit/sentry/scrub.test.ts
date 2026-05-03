import { describe, expect, it } from 'vitest';
import type { Event } from '@sentry/nextjs';
import { scrubEvent } from '@/lib/sentry/scrub';

describe('scrubEvent', () => {
  it('drops events whose extra contains a sensitive key', () => {
    const ev: Event = { extra: { firstName: 'Salma' } };
    expect(scrubEvent(ev)).toBeNull();
  });

  it('redacts sensitive keys in request data', () => {
    const ev: Event = {
      request: {
        data: { phone: '+212600000000', motif: 'mal de tête', other: 'ok' },
      },
    };
    const out = scrubEvent(ev);
    const data = out!.request!.data as Record<string, unknown>;
    expect(data.phone).toBe('[scrubbed]');
    expect(data.motif).toBe('[scrubbed]');
    expect(data.other).toBe('ok');
  });

  it('redacts CIN-like and phone-like tokens in message', () => {
    const ev: Event = {
      message: 'tried to handle CIN AB123456 and phone +212611112222',
    };
    const out = scrubEvent(ev);
    expect(out!.message).not.toMatch(/AB123456/);
    expect(out!.message).not.toMatch(/\+212611112222/);
    expect(out!.message).toMatch(/\[CIN\]/);
    expect(out!.message).toMatch(/\[PHONE\]/);
  });

  it('redacts breadcrumbs message field', () => {
    const ev: Event = {
      breadcrumbs: [
        { message: 'patient phone +212611112222 saved', timestamp: 1, type: 'info' },
      ],
    };
    const out = scrubEvent(ev);
    expect(out!.breadcrumbs![0].message).toMatch(/\[PHONE\]/);
  });

  it('passes through events without sensitive fields', () => {
    const ev: Event = { message: 'database connection lost' };
    const out = scrubEvent(ev);
    expect(out).toEqual(ev);
  });

  it('drops events whose extra carries an apiKey', () => {
    const ev = { extra: { apiKey: 'sk-test' } };
    expect(scrubEvent(ev as never)).toBeNull();
  });

  it('drops events whose extra carries an LLM messages array', () => {
    const ev = { extra: { messages: [{ role: 'user', content: 'patient context' }] } };
    expect(scrubEvent(ev as never)).toBeNull();
  });
});
