'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireDoctor } from '@/lib/auth/guards';
import { dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';
import { uploadCabinetAsset } from '@/lib/storage/upload';
import { recordAudit } from '@/lib/audit/record';

const textSchema = z.object({
  rpmNumber: z.string().trim().max(80).optional().or(z.literal('')),
  cnomNumber: z.string().trim().max(80).optional().or(z.literal('')),
  prescriptionHeaderHtml: z.string().trim().max(5000).optional().or(z.literal('')),
  defaultConsultationPriceMad: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) <= 99999.99),
      { message: 'Prix invalide.' },
    )
    .optional(),
});

export type SaveTextState = { error: string | null; saved: boolean };

export async function saveCabinetTextAction(
  _: SaveTextState,
  formData: FormData,
): Promise<SaveTextState> {
  const session = await requireDoctor();
  const parsed = textSchema.safeParse({
    rpmNumber: formData.get('rpmNumber'),
    cnomNumber: formData.get('cnomNumber'),
    prescriptionHeaderHtml: formData.get('prescriptionHeaderHtml'),
    defaultConsultationPriceMad: formData.get('defaultConsultationPriceMad') ?? '',
  });
  if (!parsed.success) return { error: 'Champs invalides.', saved: false };

  const newPrice =
    parsed.data.defaultConsultationPriceMad && parsed.data.defaultConsultationPriceMad !== ''
      ? parsed.data.defaultConsultationPriceMad
      : null;

  const [prev] = await dbAdmin()
    .select({ defaultConsultationPriceMad: tenants.defaultConsultationPriceMad })
    .from(tenants)
    .where(eq(tenants.id, session.tenantId));

  await dbAdmin()
    .update(tenants)
    .set({
      rpmNumber: parsed.data.rpmNumber || null,
      cnomNumber: parsed.data.cnomNumber || null,
      prescriptionHeaderHtml: parsed.data.prescriptionHeaderHtml || null,
      defaultConsultationPriceMad: newPrice,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, session.tenantId));

  if ((prev?.defaultConsultationPriceMad ?? null) !== newPrice) {
    await recordAudit({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: 'tenant.default_price_updated',
      entityType: 'tenant',
      entityId: session.tenantId,
      metadata: { from: prev?.defaultConsultationPriceMad ?? null, to: newPrice },
    });
  }

  revalidatePath('/settings/cabinet');
  return { error: null, saved: true };
}

export type UploadState = { error: string | null; uploaded: boolean };

export async function uploadSignatureAction(
  _: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const session = await requireDoctor();
  const file = formData.get('file');
  if (!(file instanceof File)) return { error: 'Aucun fichier reçu.', uploaded: false };
  try {
    const url = await uploadCabinetAsset(session.tenantId, 'signature', file);
    await dbAdmin()
      .update(tenants)
      .set({ signatureUrl: url, updatedAt: new Date() })
      .where(eq(tenants.id, session.tenantId));
    revalidatePath('/settings/cabinet');
    return { error: null, uploaded: true };
  } catch (err) {
    return { error: (err as Error).message, uploaded: false };
  }
}

export async function uploadStampAction(
  _: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const session = await requireDoctor();
  const file = formData.get('file');
  if (!(file instanceof File)) return { error: 'Aucun fichier reçu.', uploaded: false };
  try {
    const url = await uploadCabinetAsset(session.tenantId, 'stamp', file);
    await dbAdmin()
      .update(tenants)
      .set({ stampUrl: url, updatedAt: new Date() })
      .where(eq(tenants.id, session.tenantId));
    revalidatePath('/settings/cabinet');
    return { error: null, uploaded: true };
  } catch (err) {
    return { error: (err as Error).message, uploaded: false };
  }
}

export async function uploadLogoAction(
  _: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const session = await requireDoctor();
  const file = formData.get('file');
  if (!(file instanceof File)) return { error: 'Aucun fichier reçu.', uploaded: false };
  try {
    const url = await uploadCabinetAsset(session.tenantId, 'logo', file);
    await dbAdmin()
      .update(tenants)
      .set({ logoUrl: url, updatedAt: new Date() })
      .where(eq(tenants.id, session.tenantId));
    revalidatePath('/settings/cabinet');
    return { error: null, uploaded: true };
  } catch (err) {
    return { error: (err as Error).message, uploaded: false };
  }
}
