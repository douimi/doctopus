import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { recordAudit } from '@/lib/audit/record';
import {
  importPatients,
  parsePatientImport,
  type ImportRowError,
} from '@/lib/admin/patient-import';

export const runtime = 'nodejs';
export const maxDuration = 60;

const tenantSchema = z.object({ tenantId: z.string().uuid() });

export type ImportPatientsResponse = {
  ok: true;
  inserted: number;
  failed: ImportRowError[];
} | {
  ok: false;
  error: string;
  failed?: ImportRowError[];
};

export async function POST(req: Request): Promise<NextResponse<ImportPatientsResponse>> {
  const session = await requireAdmin();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Requête invalide.' },
      { status: 400 },
    );
  }

  const parsed = tenantSchema.safeParse({ tenantId: formData.get('tenantId') });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Cabinet invalide.' },
      { status: 400 },
    );
  }
  const { tenantId } = parsed.data;

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { ok: false, error: 'Aucun fichier reçu.' },
      { status: 400 },
    );
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { ok: false, error: 'Fichier trop volumineux (max 5 Mo).' },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const preview = parsePatientImport(buffer);

  const fatal = preview.errors.find((e) => e.field === '_columns' || e.field === '_file');
  if (fatal) {
    return NextResponse.json(
      { ok: false, error: fatal.message, failed: preview.errors },
      { status: 400 },
    );
  }

  const { inserted, failed: insertFailed } = await importPatients(tenantId, preview.rows);

  await recordAudit({
    tenantId,
    actorUserId: session.userId,
    action: 'admin.tenant.patients_imported',
    entityType: 'tenant',
    entityId: tenantId,
    metadata: {
      inserted,
      validation_errors: preview.errors.length,
      insert_errors: insertFailed.length,
    },
  });

  return NextResponse.json({
    ok: true,
    inserted,
    failed: [...preview.errors, ...insertFailed],
  });
}
