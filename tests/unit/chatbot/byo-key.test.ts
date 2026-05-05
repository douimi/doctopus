import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';
import {
  EncryptionKeyMissingError,
  clearTenantApiKey,
  getTenantApiKey,
  getTenantApiKeyLast4,
  setTenantApiKey,
  tenantHasByoKey,
} from '@/lib/chatbot/byo-key';

const TEST_PASSPHRASE = 'test-passphrase-must-be-at-least-16-chars-long';
let createdTenantId: string;
let originalEnv: string | undefined;

describe('chatbot BYO key', () => {
  beforeAll(async () => {
    originalEnv = process.env.CHATBOT_KEY_ENCRYPTION_KEY;
    process.env.CHATBOT_KEY_ENCRYPTION_KEY = TEST_PASSPHRASE;

    const [t] = await dbAdmin()
      .insert(tenants)
      .values({ name: `byo-test-${Date.now()}` })
      .returning();
    createdTenantId = t.id;
  });

  afterAll(async () => {
    if (createdTenantId) {
      await dbAdmin().delete(tenants).where(eq(tenants.id, createdTenantId));
    }
    if (originalEnv === undefined) {
      delete process.env.CHATBOT_KEY_ENCRYPTION_KEY;
    } else {
      process.env.CHATBOT_KEY_ENCRYPTION_KEY = originalEnv;
    }
  });

  it('round-trips a key via setTenantApiKey + getTenantApiKey', async () => {
    const apiKey = 'sk-test-roundtrip-abcdefXYZ1';
    await setTenantApiKey(createdTenantId, apiKey);

    expect(await getTenantApiKey(createdTenantId)).toBe(apiKey);
    expect(await tenantHasByoKey(createdTenantId)).toBe(true);

    const lookup = await getTenantApiKeyLast4(createdTenantId);
    expect(lookup.last4).toBe(apiKey.slice(-4));
  });

  it('clearTenantApiKey removes the row state', async () => {
    await setTenantApiKey(createdTenantId, 'sk-clear-12345');
    expect(await tenantHasByoKey(createdTenantId)).toBe(true);

    await clearTenantApiKey(createdTenantId);
    expect(await tenantHasByoKey(createdTenantId)).toBe(false);
    expect(await getTenantApiKey(createdTenantId)).toBeNull();
    const lookup = await getTenantApiKeyLast4(createdTenantId);
    expect(lookup.last4).toBeNull();
  });

  it('throws when the encryption passphrase is not configured', async () => {
    delete process.env.CHATBOT_KEY_ENCRYPTION_KEY;
    await expect(
      setTenantApiKey(createdTenantId, 'sk-no-passphrase'),
    ).rejects.toBeInstanceOf(EncryptionKeyMissingError);
    process.env.CHATBOT_KEY_ENCRYPTION_KEY = TEST_PASSPHRASE;
  });

  it('returns null for tenants without a BYO key', async () => {
    await clearTenantApiKey(createdTenantId);
    expect(await getTenantApiKey(createdTenantId)).toBeNull();
  });
});
