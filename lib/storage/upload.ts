import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export async function uploadCabinetAsset(
  tenantId: string,
  kind: 'signature' | 'stamp',
  file: File,
): Promise<string> {
  if (file.size === 0) throw new Error('Empty file');
  if (file.size > 2 * 1024 * 1024) throw new Error('Fichier trop volumineux (>2 Mo).');

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : null;
  if (!ext) throw new Error('Format non supporté (PNG ou JPEG uniquement).');

  const path = `tenants/${tenantId}/${kind}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const admin = createClient(env().NEXT_PUBLIC_SUPABASE_URL, env().SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const upload = await admin.storage.from('cabinet-assets').upload(path, buf, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const pub = admin.storage.from('cabinet-assets').getPublicUrl(path);
  return pub.data.publicUrl;
}
