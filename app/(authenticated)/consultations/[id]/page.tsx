import { notFound } from 'next/navigation';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { requireDoctor } from '@/lib/auth/guards';
import { getConsultationById } from '@/lib/consultations/queries';
import { getPatientDetail } from '@/lib/patients/queries';
import { getPrescriptionForConsultation } from '@/lib/prescriptions/queries';
import { dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';
import { PatientCard } from '@/components/patients/patient-card';
import { Button } from '@/components/ui/button';
import { ConsultationEditor } from './editor';
import { PrescriptionEditor } from './prescription/editor';
import { finalizeConsultationAction } from './actions';
import { AssistantPanel } from './assistant/panel';

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
  const presc = await getPrescriptionForConsultation(session.tenantId, id);

  const [tenant] = await dbAdmin()
    .select({
      enabled: tenants.chatbotEnabled,
      provider: tenants.chatbotProvider,
      model: tenants.chatbotModel,
      balance: tenants.chatbotCreditsBalance,
      ackAt: tenants.chatbotDisclaimerAcknowledgedAt,
    })
    .from(tenants)
    .where(eq(tenants.id, session.tenantId));

  const assistantState =
    !tenant?.enabled || !tenant.provider || !tenant.model
      ? ({ kind: 'disabled' } as const)
      : tenant.balance <= 0 && detail.consultation.aiCreditConsumedAt === null
        ? ({ kind: 'no_credits', balance: 0 } as const)
        : ({
            kind: 'ready',
            balance: tenant.balance,
            disclaimerAcknowledged: tenant.ackAt !== null,
          } as const);

  const v = detail.vitals;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4 min-w-0">
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
          prescriptionSlot={
            <PrescriptionEditor
              consultationId={id}
              prescriptionId={presc?.prescription.id ?? null}
              items={presc?.items ?? []}
              readOnly={detail.consultation.isFinalized}
            />
          }
        />
      </div>
      <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] min-w-0">
        <AssistantPanel
          consultationId={id}
          state={assistantState}
          readOnly={detail.consultation.isFinalized}
        />
      </div>
    </div>
  );
}
