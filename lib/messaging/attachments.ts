import 'server-only';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { extensionFor } from './types';

/**
 * Private `chat-attachments` bucket (migration 0021). The bucket has no
 * storage policies for `authenticated`: callers prove membership through
 * RLS first (lib/messaging/queries), then we mint short-lived signed URLs
 * with the service role.
 */
export const ATTACHMENT_BUCKET = 'chat-attachments';
const DOWNLOAD_TTL_S = 5 * 60;

function storage() {
  return createClient(env().NEXT_PUBLIC_SUPABASE_URL, env().SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).storage.from(ATTACHMENT_BUCKET);
}

/** `<tenant>/<conversation>/<uuid>.<ext>` — the prefix is re-checked on send. */
export function attachmentPrefix(tenantId: string, conversationId: string): string {
  return `${tenantId}/${conversationId}/`;
}

export async function createUploadTarget(
  tenantId: string,
  conversationId: string,
  mime: string,
): Promise<{ path: string; token: string }> {
  const ext = extensionFor(mime);
  if (!ext) throw new Error('Unsupported mime');
  const path = `${attachmentPrefix(tenantId, conversationId)}${randomUUID()}.${ext}`;
  const { data, error } = await storage().createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error('createSignedUploadUrl failed');
  return { path, token: data.token };
}

/** Size of the uploaded object, or null when it doesn't exist. */
export async function uploadedSize(path: string): Promise<number | null> {
  const slash = path.lastIndexOf('/');
  const folder = path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data, error } = await storage().list(folder, { search: name, limit: 5 });
  if (error || !data) return null;
  const hit = data.find((o) => o.name === name);
  if (!hit) return null;
  const size = (hit.metadata as { size?: number } | null)?.size;
  return typeof size === 'number' ? size : 0;
}

export async function signedDownloadUrl(path: string, downloadName?: string): Promise<string | null> {
  const { data, error } = await storage().createSignedUrl(
    path,
    DOWNLOAD_TTL_S,
    downloadName ? { download: downloadName } : undefined,
  );
  if (error || !data) return null;
  return data.signedUrl;
}

export async function removeAttachment(path: string): Promise<void> {
  await storage().remove([path]);
}
