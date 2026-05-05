-- Migration 0011: per-cabinet AI API key (BYO key) support.
--
-- Each tenant may now hold its own API key for its configured chatbot
-- provider. The plaintext key never leaves the server: we encrypt it at
-- rest using pgcrypto's pgp_sym_encrypt with a passphrase taken from
-- the CHATBOT_KEY_ENCRYPTION_KEY env var. We also persist the last 4
-- characters in plaintext so the super-admin UI can show a masked
-- preview ("•••• …xyz1") without round-tripping a decrypt.
--
-- Tenants without a BYO key fall back to the platform-wide ANTHROPIC /
-- OPENAI / MISTRAL env keys. When a tenant has a BYO key, AI usage on
-- their behalf does NOT decrement their platform credits — they pay
-- their provider directly.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
ALTER TABLE "tenants"
  ADD COLUMN "chatbot_api_key_ciphertext" bytea;
--> statement-breakpoint
ALTER TABLE "tenants"
  ADD COLUMN "chatbot_api_key_last4" text;
