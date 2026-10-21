import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { getPatientById } from '@/lib/patients/queries';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { PatientForm } from '../../patient-form';
import { updatePatientAction } from './actions';

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const patient = await getPatientById(session.tenantId, id);
  if (!patient) notFound();
  const fullName = `${patient.lastName} ${patient.firstName}`;

  return (
    <>
      <PageHeader
        width="narrow"
        back={{ href: `/patients/${id}`, label: fullName }}
        title="Modifier le dossier"
        description="Identité, contact et couverture du patient."
      />
      <PageBody width="narrow">
        <PatientForm
          action={updatePatientAction}
          hidden={{ id: patient.id }}
          submitLabel="Enregistrer"
          cancelHref={`/patients/${id}`}
          defaults={{
            lastName: patient.lastName,
            firstName: patient.firstName,
            gender: patient.gender,
            dateOfBirth: patient.dateOfBirth ?? '',
            phone: patient.phone ?? '',
            cin: patient.cin ?? '',
            coverageType: patient.coverageType ?? '',
            coverageId: patient.coverageId ?? '',
            address: patient.address ?? '',
            notes: patient.notes ?? '',
          }}
        />
      </PageBody>
    </>
  );
}
