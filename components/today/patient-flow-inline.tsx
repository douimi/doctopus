'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PatientPicker } from '@/components/patients/patient-picker';
import { BookAppointmentForm } from './book-appointment-form';
import { WalkInForm } from './walk-in-form';
import type { FlowPatient } from './selected-patient';

/**
 * Full-page version of the RDV / walk-in flow (fallback routes
 * /today/book, /today/walk-in, /today/walk-in/suivi). Same picker and
 * forms as the dialogs over /today; returns to /today on success.
 */
export function PatientFlowInline({
  kind,
  initialPatient,
  defaultQuery,
  defaultFollowUp = false,
}: {
  kind: 'book' | 'walkin';
  initialPatient?: FlowPatient | null;
  defaultQuery?: string;
  defaultFollowUp?: boolean;
}) {
  const router = useRouter();
  const [patient, setPatient] = useState<FlowPatient | null>(initialPatient ?? null);
  const done = useCallback(() => router.push('/today'), [router]);
  const cancel = useCallback(() => router.push('/today'), [router]);
  const nextPath = kind === 'book' ? '/today/book' : '/today/walk-in';

  if (!patient) {
    return (
      <div className="panel p-5">
        <PatientPicker
          onSelect={setPatient}
          defaultQuery={defaultQuery}
          newPatientHref={`/patients/new?next=${encodeURIComponent(nextPath)}`}
        />
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      {kind === 'book' ? (
        <BookAppointmentForm
          key={patient.id}
          layout="page"
          patient={patient}
          onDone={done}
          onCancel={cancel}
          onChangePatient={() => setPatient(null)}
        />
      ) : (
        <WalkInForm
          key={patient.id}
          layout="page"
          patient={patient}
          defaultFollowUp={defaultFollowUp}
          onDone={done}
          onCancel={cancel}
          onChangePatient={() => setPatient(null)}
        />
      )}
    </div>
  );
}
