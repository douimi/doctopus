import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireDoctor } from '@/lib/auth/guards';
import { getConsultationById } from '@/lib/consultations/queries';
import { getPatientDetail } from '@/lib/patients/queries';
import { PatientCard } from '@/components/patients/patient-card';
import { Button } from '@/components/ui/button';
import { ConsultationEditor } from './editor';
import { finalizeConsultationAction } from './actions';

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireDoctor();
  const detail = await getConsultationById(session.tenantId, id);
  if (!detail) notFound();
  const patientData = await getPatientDetail(session.tenantId, detail.consultation.patientId);
  if (!patientData) notFound();

  const v = detail.vitals;
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-2">
        <Link href="/today" className="text-sm underline">
          ← Aujourd&apos;hui
        </Link>
        {!detail.consultation.isFinalized ? (
          <form action={finalizeConsultationAction}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit">Terminer la consultation</Button>
          </form>
        ) : (
          <span className="text-sm text-gray-600">Consultation terminée</span>
        )}
      </div>

      <PatientCard
        patient={patientData.patient}
        allergies={patientData.allergies}
        conditions={patientData.conditions}
      />

      <ConsultationEditor
        consultationId={id}
        readOnly={detail.consultation.isFinalized}
        initialSections={{
          motif: detail.consultation.motif ?? '',
          historyNotes: detail.consultation.historyNotes ?? '',
          examNotes: detail.consultation.examNotes ?? '',
          diagnosis: detail.consultation.diagnosis ?? '',
          followUpNotes: detail.consultation.followUpNotes ?? '',
        }}
        initialVitals={{
          weightKg: v?.weightKg ?? '',
          heightCm: v?.heightCm ?? '',
          temperatureC: v?.temperatureC ?? '',
          bpSystolic: v?.bpSystolic != null ? String(v.bpSystolic) : '',
          bpDiastolic: v?.bpDiastolic != null ? String(v.bpDiastolic) : '',
          heartRate: v?.heartRate != null ? String(v.heartRate) : '',
          notes: v?.notes ?? '',
        }}
      />
    </div>
  );
}
