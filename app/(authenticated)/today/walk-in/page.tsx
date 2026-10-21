import { requireSession } from '@/lib/auth/session';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { PatientFlowInline } from '@/components/today/patient-flow-inline';
import { resolveFlowPatient } from '../flow-patient';

type Props = {
  searchParams: Promise<{ q?: string; patient?: string }>;
};

/**
 * Full-page fallback for "Mettre en salle d'attente" (the board opens the
 * same flow in a dialog).
 */
export default async function WalkInPage({ searchParams }: Props) {
  const session = await requireSession();
  const { q = '', patient: patientId } = await searchParams;
  const initialPatient = await resolveFlowPatient(session.tenantId, patientId);

  return (
    <>
      <PageHeader
        width="narrow"
        back={{ href: '/today', label: "Aujourd'hui" }}
        title="Mettre en salle d'attente"
        description="Patient arrivé sans rendez-vous : choisissez-le, ajoutez un motif si besoin."
      />
      <PageBody width="narrow">
        <PatientFlowInline kind="walkin" initialPatient={initialPatient} defaultQuery={q} />
      </PageBody>
    </>
  );
}
