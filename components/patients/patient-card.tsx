import { ageFromDob } from '@/lib/patients/age';
import type { Patient, PatientAllergy, PatientChronicCondition } from '@/db/schema';

const COVERAGE_LABEL: Record<string, string> = {
  cnss: 'CNSS',
  cnops: 'CNOPS',
  amo: 'AMO',
  ramed: 'RAMED',
  mutuelle: 'Mutuelle',
  none: 'Sans',
  other: 'Autre',
};

export function PatientCard({
  patient,
  allergies,
  conditions,
}: {
  patient: Patient;
  allergies: PatientAllergy[];
  conditions: PatientChronicCondition[];
}) {
  return (
    <div className="rounded-md border p-4 space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">
            {patient.lastName} {patient.firstName}
          </div>
          <div className="text-sm text-gray-600">
            {ageFromDob(patient.dateOfBirth)} ans · {patient.gender === 'm' ? 'H' : 'F'}{' '}
            {patient.phone ? `· ${patient.phone}` : ''}
            {patient.cin ? ` · CIN ${patient.cin}` : ''}
          </div>
        </div>
        {patient.coverageType ? (
          <div className="text-sm rounded bg-gray-100 px-2 py-1">
            {COVERAGE_LABEL[patient.coverageType] ?? patient.coverageType}
            {patient.coverageId ? ` · ${patient.coverageId}` : ''}
          </div>
        ) : null}
      </div>
      {allergies.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {allergies.map((a) => (
            <span key={a.id} className="rounded bg-red-100 text-red-800 text-xs px-2 py-1">
              ⚠ Allergie : {a.label}
            </span>
          ))}
        </div>
      ) : null}
      {conditions.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {conditions.map((c) => (
            <span key={c.id} className="rounded bg-amber-100 text-amber-800 text-xs px-2 py-1">
              {c.label}
            </span>
          ))}
        </div>
      ) : null}
      {patient.notes ? <p className="text-sm whitespace-pre-wrap">{patient.notes}</p> : null}
    </div>
  );
}
