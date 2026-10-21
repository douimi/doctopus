import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

// Guards the tailwind-merge extension in lib/utils.ts: without it the
// custom type-scale classes are treated as colours and silently dropped.
describe('cn', () => {
  it('keeps a custom font size next to a text colour', () => {
    expect(cn('text-small text-muted-foreground')).toBe('text-small text-muted-foreground');
    expect(cn('text-small text-danger-ink')).toBe('text-small text-danger-ink');
  });

  it('lets a custom size override a stock one (and vice versa)', () => {
    expect(cn('text-sm text-small')).toBe('text-small');
    expect(cn('text-body text-xs')).toBe('text-xs');
  });
});
