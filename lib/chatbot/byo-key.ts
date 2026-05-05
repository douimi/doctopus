import 'server-only';
import { sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import type { Provider } from './provider';

export class EncryptionKeyMissingError extends Error {
  code = 'encryption_key_missing' as const;
  constructor() {
    super(
      'CHATBOT_KEY_ENCRYPTION_KEY is not configured. Set it in your environment to use per-tenant API keys.',
    );
  }
}

// Read the passphrase from process.env directly (not via the cached
// env() loader) so tests that mutate process.env take effect without
// the module-level env cache standing in the way. Production also benefits:
// rotating the key only requires a process restart, not a code change.
function passphrase(): string {
  const k = process.env.CHATBOT_KEY_ENCRYPTION_KEY;
  if (!k || k.length < 16) throw new EncryptionKeyMissingError();
  return k;
}

function last4(value: string): string {
  return value.length <= 4 ? value : value.slice(-4);
}

/**
 * Stores `apiKey` for a tenant, encrypted at rest with pgcrypto.
 * Also persists the trailing 4 characters in plaintext for UI display.
 */
export async function setTenantApiKey(tenantId: string, apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (trimmed.length === 0) {
    throw new Error('API key cannot be empty');
  }
  const pass = passphrase();
  await dbAdmin().execute(sql`
    UPDATE tenants
       SET chatbot_api_key_ciphertext = pgp_sym_encrypt(${trimmed}, ${pass}),
           chatbot_api_key_last4      = ${last4(trimmed)},
           updated_at                 = now()
     WHERE id = ${tenantId}::uuid
  `);
}

/**
 * Removes a tenant's BYO API key. Subsequent chatbot calls fall back to
 * the platform-wide env-configured provider keys.
 */
export async function clearTenantApiKey(tenantId: string): Promise<void> {
  await dbAdmin().execute(sql`
    UPDATE tenants
       SET chatbot_api_key_ciphertext = NULL,
           chatbot_api_key_last4      = NULL,
           updated_at                 = now()
     WHERE id = ${tenantId}::uuid
  `);
}

/**
 * Returns the decrypted API key for a tenant if one is configured, or
 * `null` to signal the caller should fall back to env-configured keys.
 *
 * Plaintext only briefly leaves the DB to be passed to the AI SDK.
 */
export async function getTenantApiKey(tenantId: string): Promise<string | null> {
  const rows = await dbAdmin().execute<{ key: string | null }>(sql`
    SELECT pgp_sym_decrypt(chatbot_api_key_ciphertext, ${passphrase()}) AS key
      FROM tenants
     WHERE id = ${tenantId}::uuid
       AND chatbot_api_key_ciphertext IS NOT NULL
  `);
  const row = (rows as unknown as Array<{ key: string | null }>)[0];
  return row?.key ?? null;
}

/**
 * True iff the tenant has a BYO API key on file. Cheap — does not decrypt.
 */
export async function tenantHasByoKey(tenantId: string): Promise<boolean> {
  const [row] = await dbAdmin().execute<{ has_key: boolean }>(sql`
    SELECT (chatbot_api_key_ciphertext IS NOT NULL) AS has_key
      FROM tenants
     WHERE id = ${tenantId}::uuid
  `);
  return Boolean(row?.has_key);
}

export type Last4Lookup = {
  provider: Provider | null;
  model: string | null;
  last4: string | null;
};

export async function getTenantApiKeyLast4(tenantId: string): Promise<Last4Lookup> {
  const [row] = await dbAdmin().execute<{
    chatbot_provider: Provider | null;
    chatbot_model: string | null;
    chatbot_api_key_last4: string | null;
  }>(sql`
    SELECT chatbot_provider, chatbot_model, chatbot_api_key_last4
      FROM tenants
     WHERE id = ${tenantId}::uuid
  `);
  return {
    provider: row?.chatbot_provider ?? null,
    model: row?.chatbot_model ?? null,
    last4: row?.chatbot_api_key_last4 ?? null,
  };
}
