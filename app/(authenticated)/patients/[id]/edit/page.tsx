import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { getPatientById } from '@/lib/patients/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>
          Modifier {patient.lastName} {patient.firstName}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
  );
}
