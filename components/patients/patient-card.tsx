import { AlertTriangle, HeartPulse, IdCard, Phone, ShieldCheck } from 'lucide-react';
import { ageFromDob } from '@/lib/patients/age';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
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
  const fullName = `${patient.lastName} ${patient.firstName}`;
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar name={fullName} size="lg" />
            <div className="min-w-0">
              <div className="text-title font-semibold leading-tight truncate">
                {fullName}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted-foreground mt-1">
                <span className="tabular-nums">
                  {ageFromDob(patient.dateOfBirth)} ans · {patient.gender === 'm' ? 'Homme' : 'Femme'}
                </span>
                {patient.phone ? (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Phone className="size-3" aria-hidden />
                    {patient.phone}
                  </span>
                ) : null}
                {patient.cin ? (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <IdCard className="size-3" aria-hidden />
                    {patient.cin}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          {patient.coverageType ? (
            <StatusBadge variant="info" icon={ShieldCheck} className="shrink-0">
              {COVERAGE_LABEL[patient.coverageType] ?? patient.coverageType}
              {patient.coverageId ? ` · ${patient.coverageId}` : ''}
            </StatusBadge>
          ) : null}
        </div>

        {allergies.length > 0 || conditions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
            {allergies.map((a) => (
              <StatusBadge key={a.id} variant="danger" icon={AlertTriangle}>
                Allergie : {a.label}
              </StatusBadge>
            ))}
            {conditions.map((c) => (
              <StatusBadge key={c.id} variant="warning" icon={HeartPulse}>
                {c.label}
              </StatusBadge>
            ))}
          </div>
        ) : null}

        {patient.notes ? (
          <p className="text-body whitespace-pre-wrap text-muted-foreground border-t border-border pt-3">
            {patient.notes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
