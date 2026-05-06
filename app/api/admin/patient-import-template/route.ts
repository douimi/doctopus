import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { buildPatientImportTemplate } from '@/lib/admin/patient-import';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  await requireAdmin();
  const csv = buildPatientImportTemplate();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="doctopus-patients-template.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
}
