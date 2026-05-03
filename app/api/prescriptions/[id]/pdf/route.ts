import { renderToBuffer } from '@react-pdf/renderer';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { requireDoctor } from '@/lib/auth/guards';
import { getPrescriptionDetail } from '@/lib/prescriptions/queries';
import { dbAdmin } from '@/db/client';
import { tenants, patients, userProfiles } from '@/db/schema';
import { PrescriptionPdfDocument } from '@/components/prescriptions/pdf-document';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await requireDoctor();
  const detail = await getPrescriptionDetail(session.tenantId, id);
  if (!detail) {
    return new NextResponse('Not found', { status: 404 });
  }

  const admin = dbAdmin();
  const [tenant] = await admin.select().from(tenants).where(eq(tenants.id, session.tenantId));
  const [patient] = await admin
    .select()
    .from(patients)
    .where(eq(patients.id, detail.prescription.patientId));
  const [doctor] = await admin
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, detail.prescription.doctorId));
  if (!tenant || !patient || !doctor) {
    return new NextResponse('Not found', { status: 404 });
  }

  const pdf = await renderToBuffer(
    PrescriptionPdfDocument({
      tenant,
      doctor: { fullName: doctor.fullName },
      patient: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
      },
      prescription: detail.prescription,
      items: detail.items,
    }),
  );

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ordonnance-${id}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
