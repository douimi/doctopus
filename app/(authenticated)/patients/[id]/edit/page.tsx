import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { getPatientById } from '@/lib/patients/queries';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shell/page-header';
import { EditPatientForm } from './form';

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const patient = await getPatientById(session.tenantId, id);
  if (!patient) notFound();

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            href={`/patients/${id}`}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            style={{ transitionDuration: 'var(--duration-fast)' }}
          >
            <ArrowLeft className="size-3" aria-hidden />
            Fiche patient
          </Link>
        }
        title={`Modifier ${patient.lastName} ${patient.firstName}`}
        description="Mettez à jour les informations du dossier."
      />

      <div className="px-6 py-6">
        <Card className="max-w-2xl">
          <CardContent className="space-y-4">
            <EditPatientForm
              patient={{
                id: patient.id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                gender: patient.gender,
                dateOfBirth: patient.dateOfBirth,
                phone: patient.phone ?? '',
                cin: patient.cin ?? '',
                coverageType: patient.coverageType ?? '',
                coverageId: patient.coverageId ?? '',
                address: patient.address ?? '',
                notes: patient.notes ?? '',
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
