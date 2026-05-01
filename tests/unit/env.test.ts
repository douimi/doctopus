import { describe, expect, it } from 'vitest';
import { envSchema } from '@/lib/env';

describe('env schema', () => {
  it('accepts a valid environment', () => {
    expect(() =>
      envSchema.parse({
        NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE: 'service-role-key',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
        DATABASE_URL_DIRECT: 'postgres://user:pass@localhost:5432/db',
        APP_URL: 'http://localhost:3000',
        CRON_SECRET: 'cron-secret',
      }),
    ).not.toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => envSchema.parse({})).toThrow();
  });

  it('requires SUPABASE_SERVICE_ROLE not be empty', () => {
    expect(() =>
      envSchema.parse({
        NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE: '',
        DATABASE_URL: 'postgres://x',
        DATABASE_URL_DIRECT: 'postgres://x',
        APP_URL: 'http://localhost:3000',
        CRON_SECRET: 'cron-secret',
      }),
    ).toThrow();
  });
});
