import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { PatientFlowInline } from '@/components/today/patient-flow-inline';
import { resolveFlowPatient } from '../../flow-patient';

type Props = {
  searchParams: Promise<{ patient?: string }>;
};

/**
 * Legacy entry point "walk-in as a follow-up". Same form as the walk-in
 * flow with "C'est un suivi" pre-ticked, so the parent consultation is
 * picked in one place.
 */
export default async function WalkInSuiviPage({ searchParams }: Props) {
  const session = await requireSession();
  const { patient: patientId } = await searchParams;
  const patient = await resolveFlowPatient(session.tenantId, patientId);
  if (!patient) notFound();

  return (
    <>
      <PageHeader
        width="narrow"
        back={{ href: '/today/walk-in', label: "Salle d'attente" }}
        title="Suivi en salle d'attente"
        description="Choisissez la consultation à laquelle rattacher ce suivi."
      />
      <PageBody width="narrow">
        <PatientFlowInline kind="walkin" initialPatient={patient} defaultFollowUp />
      </PageBody>
    </>
  );
}
