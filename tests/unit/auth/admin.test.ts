import { afterEach, describe, expect, it } from 'vitest';
import { isAdminEmail } from '@/lib/auth/admin';

describe('isAdminEmail', () => {
  const original = process.env.SUPER_ADMIN_EMAILS;
  afterEach(() => {
    if (original === undefined) delete process.env.SUPER_ADMIN_EMAILS;
    else process.env.SUPER_ADMIN_EMAILS = original;
  });

  it('returns false when allowlist is unset', () => {
    delete process.env.SUPER_ADMIN_EMAILS;
    expect(isAdminEmail('foo@bar.com')).toBe(false);
  });

  it('returns false when allowlist is empty', () => {
    process.env.SUPER_ADMIN_EMAILS = '';
    expect(isAdminEmail('foo@bar.com')).toBe(false);
  });

  it('returns true for a listed email (case-insensitive)', () => {
    process.env.SUPER_ADMIN_EMAILS = 'Admin@Example.com,foo@bar.com';
    expect(isAdminEmail('admin@example.com')).toBe(true);
    expect(isAdminEmail('FOO@BAR.COM')).toBe(true);
  });

  it('handles whitespace around emails', () => {
    process.env.SUPER_ADMIN_EMAILS = '  admin@example.com , foo@bar.com  ';
    expect(isAdminEmail('admin@example.com')).toBe(true);
  });

  it('returns false for unlisted email', () => {
    process.env.SUPER_ADMIN_EMAILS = 'admin@example.com';
    expect(isAdminEmail('other@example.com')).toBe(false);
  });

  it('wildcard *@domain allows any email on that domain', () => {
    process.env.SUPER_ADMIN_EMAILS = '*@example.com';
    expect(isAdminEmail('alice@example.com')).toBe(true);
    expect(isAdminEmail('bob@example.com')).toBe(true);
    expect(isAdminEmail('alice@other.com')).toBe(false);
  });

  it('bare * allows any email', () => {
    process.env.SUPER_ADMIN_EMAILS = '*';
    expect(isAdminEmail('anyone@anywhere.org')).toBe(true);
  });

  it('mixed list with wildcard and literal both work', () => {
    process.env.SUPER_ADMIN_EMAILS = 'admin@example.com,*@e2e.local';
    expect(isAdminEmail('admin@example.com')).toBe(true);
    expect(isAdminEmail('test-user@e2e.local')).toBe(true);
    expect(isAdminEmail('outsider@other.com')).toBe(false);
  });
});
