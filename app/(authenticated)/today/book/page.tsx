import { requireSession } from '@/lib/auth/session';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { PatientFlowInline } from '@/components/today/patient-flow-inline';
import { resolveFlowPatient } from '../flow-patient';

type Props = {
  searchParams: Promise<{ q?: string; patient?: string }>;
};

/**
 * Full-page fallback for "Nouveau rendez-vous" (the board opens the same
 * flow in a dialog). Also the landing spot after "Nouveau patient" from
 * the picker: `?patient=<id>` preselects the freshly created file.
 */
export default async function BookPage({ searchParams }: Props) {
  const session = await requireSession();
  const { q = '', patient: patientId } = await searchParams;
  const initialPatient = await resolveFlowPatient(session.tenantId, patientId);

  return (
    <>
      <PageHeader
        width="narrow"
        back={{ href: '/today', label: "Aujourd'hui" }}
        title="Nouveau rendez-vous"
        description="Choisissez le patient, puis le jour et l'heure."
      />
      <PageBody width="narrow">
        <PatientFlowInline kind="book" initialPatient={initialPatient} defaultQuery={q} />
      </PageBody>
    </>
  );
}
