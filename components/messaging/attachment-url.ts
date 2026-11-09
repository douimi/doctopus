'use client';

import { useEffect, useState } from 'react';
import { getAttachmentUrlAction } from '@/app/(authenticated)/messages/actions';

// Signed URLs live 5 min server-side; reuse them for 4.
const TTL_MS = 4 * 60 * 1000;
const cache = new Map<string, { url: string; at: number }>();
const inflight = new Map<string, Promise<string | null>>();

export async function fetchAttachmentUrl(messageId: string, download = false): Promise<string | null> {
  const key = `${messageId}:${download ? 'dl' : 'view'}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.url;
  const pending = inflight.get(key);
  if (pending) return pending;
  const p = getAttachmentUrlAction(messageId, { download })
    .then((url) => {
      if (url) cache.set(key, { url, at: Date.now() });
      return url;
    })
    .catch(() => null)
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Signed URL for an image/voice attachment (or the local preview while sending). */
export function useAttachmentUrl(
  messageId: string,
  opts: { localUrl?: string; enabled: boolean },
): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (opts.localUrl || !opts.enabled) return;
    let cancelled = false;
    void fetchAttachmentUrl(messageId).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [messageId, opts.localUrl, opts.enabled]);
  return opts.localUrl ?? url;
}
