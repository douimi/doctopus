import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireDoctor } from '@/lib/auth/guards';
import {
  getConsultationById,
  getConsultationFollowUpRelations,
  getLatestHistoryNote,
  listPatientTimeline,
} from '@/lib/consultations/queries';
import { getPatientDetail } from '@/lib/patients/queries';
import { getPrescriptionForConsultation } from '@/lib/prescriptions/queries';
import { getAutocompleteSuggestions } from '@/lib/prescriptions/autocomplete';
import { dbAdmin } from '@/db/client';
import { tenants } from '@/db/schema';
import { PatientHistoryPanel } from '@/components/patients/patient-history-panel';
import { LiveRefresh } from '@/components/shell/live-refresh';
import { CockpitProvider } from '@/components/consultations/cockpit-context';
import { ConsultationHeader } from '@/components/consultations/consultation-header';
import { AssistantDrawer, ContextRail } from '@/components/consultations/cockpit-panels';
import { AllergiesEditor } from '@/components/consultations/allergies-editor';
import {
  ConsultationHistoryList,
  type HistoryListEntry,
} from '@/components/consultations/consultation-history-list';
import { formatVitalsLine } from '@/components/consultations/vitals-format';
import { FinalizePricingDialog } from '@/components/payments/finalize-pricing-dialog';
import { FinalizedTarificationBadge } from '@/components/payments/finalized-tarification-badge';
import { ConsultationEditor } from './editor';
import { AssistantPanel } from './assistant/panel';
import { assistantUnavailableReason, type AssistantState } from './assistant/state';
import { FollowUpRelations } from './follow-up-relations';

const HISTORY_FIELDS = [
  'historyMedical',
  'historySurgical',
  'historyFamily',
  'historyTreatments',
  'historyLifestyle',
] as const;

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireDoctor();

  // Round 1: everything that only needs the consultation id.
  const [detail, presc, tenantRows, suggestions] = await Promise.all([
    getConsultationById(session.tenantId, id),
    getPrescriptionForConsultation(session.tenantId, id),
    dbAdmin()
      .select({
        enabled: tenants.chatbotEnabled,
        provider: tenants.chatbotProvider,
        model: tenants.chatbotModel,
        balance: tenants.chatbotCreditsBalance,
        ackAt: tenants.chatbotDisclaimerAcknowledgedAt,
        defaultConsultationPriceMad: tenants.defaultConsultationPriceMad,
        apiKeyLast4: tenants.chatbotApiKeyLast4,
      })
      .from(tenants)
      .where(eq(tenants.id, session.tenantId)),
    getAutocompleteSuggestions(session.tenantId, session.userId),
  ]);
  if (!detail) notFound();
  const c = detail.consultation;

  // Round 2: everything keyed on the patient / consultation row.
  const [patientData, followUps, latestHistoryNote, timeline] = await Promise.all([
    getPatientDetail(session.tenantId, c.patientId),
    getConsultationFollowUpRelations(session.tenantId, c),
    getLatestHistoryNote(session.tenantId, c.patientId, id),
    listPatientTimeline(session.tenantId, c.patientId, { excludeConsultationId: id, limit: 5 }),
  ]);
  if (!patientData) notFound();

  const tenant = tenantRows[0];
  const hasApiKey = tenant?.apiKeyLast4 !== null && tenant?.apiKeyLast4 !== undefined;
  const assistantState: AssistantState =
    !tenant?.enabled || !tenant.provider || !tenant.model
      ? { kind: 'disabled' }
      : !hasApiKey
        ? { kind: 'no_api_key' }
        : tenant.balance <= 0 && c.aiCreditConsumedAt === null
          ? { kind: 'no_credits', balance: 0 }
          : {
              kind: 'ready',
              balance: tenant.balance,
              disclaimerAcknowledged: tenant.ackAt !== null,
            };
  const aiReason = assistantUnavailableReason(assistantState);

  const p = patientData.patient;
  const patientName = `${p.lastName} ${p.firstName}`;
  const history = {
    historyMedical: p.historyMedical ?? '',
    historySurgical: p.historySurgical ?? '',
    historyFamily: p.historyFamily ?? '',
    historyTreatments: p.historyTreatments ?? '',
    historyLifestyle: p.historyLifestyle ?? '',
  };
  // One-line summary for the header below lg (where the rail is a sheet):
  // chronic conditions first, then the structured antécédents.
  const summaryParts = [
    ...patientData.conditions.map((x) => x.label),
    ...HISTORY_FIELDS.map((k) => history[k].trim().replace(/\s+/g, ' ')).filter(Boolean),
  ];
  const historySummary = summaryParts.length > 0 ? summaryParts.join(' · ') : null;

  // Historique + previous-visit vitals hint.
  const childIds = new Set(followUps.children.map((x) => x.id));
  const historyEntries: HistoryListEntry[] = timeline.entries.map((e) => ({
    id: e.id,
    consultedAt: e.consultedAt,
    motif: e.motif,
    diagnosis: e.diagnosis,
    isFinalized: e.isFinalized,
    isFollowUp: e.parentConsultationId !== null,
    relation:
      e.id === c.parentConsultationId ? 'parent' : childIds.has(e.id) ? 'child' : null,
    vitalsLine: formatVitalsLine(e.vitals),
    rx: e.rx,
  }));
  const previous = timeline.entries.find(
    (e) => e.consultedAt < c.consultedAt && formatVitalsLine(e.vitals) !== null,
  );
  const previousVitals = previous
    ? { consultedAt: previous.consultedAt, line: formatVitalsLine(previous.vitals)! }
    : null;
  const shownIds = new Set(timeline.entries.map((e) => e.id));
  const extraChildren = followUps.children.filter((x) => !shownIds.has(x.id));

  const v = detail.vitals;

  return (
    <CockpitProvider aiAvailable={assistantState.kind === 'ready'}>
      <LiveRefresh />
      <ConsultationHeader
        consultationId={id}
        patient={{
          id: p.id,
          fullName: patientName,
          dateOfBirth: p.dateOfBirth,
          gender: p.gender,
        }}
        allergies={patientData.allergies.map((a) => a.label)}
        consultedAt={c.consultedAt}
        parent={followUps.parent}
        isFinalized={c.isFinalized}
        isPaid={c.paymentStatus === 'paid'}
        aiUnavailableReason={aiReason}
        historySummary={historySummary}
        historyCount={timeline.total}
        primaryAction={
          c.isFinalized ? (
            <FinalizedTarificationBadge
              isFree={c.isFree}
              priceMad={c.priceMad}
              paymentStatus={c.paymentStatus as 'awaiting' | 'paid' | 'free'}
              paymentMethod={c.paymentMethod}
            />
          ) : (
            <FinalizePricingDialog
              consultationId={id}
              patientName={patientName}
              defaultPriceMad={tenant?.defaultConsultationPriceMad ?? null}
              defaultIsFree={c.parentConsultationId !== null}
            />
          )
        }
      />

      <div className="lg:grid lg:grid-cols-[18.75rem_minmax(0,1fr)] xl:grid-cols-[18.75rem_minmax(0,1fr)_auto]">
        <ContextRail>
          <AllergiesEditor
            patientId={p.id}
            allergies={patientData.allergies.map((a) => ({ id: a.id, label: a.label }))}
          />
          <PatientHistoryPanel
            patientId={p.id}
            initial={history}
            allergies={patientData.allergies.map((a) => a.label)}
            conditions={patientData.conditions.map((x) => x.label)}
            updatedAt={p.historyUpdatedAt}
            latestNote={latestHistoryNote}
            canEdit
            hideAllergies
          />
          <ConsultationHistoryList
            entries={historyEntries}
            total={timeline.total}
            patientId={p.id}
          />
          <FollowUpRelations items={extraChildren} />
        </ContextRail>

        <div className="min-w-0 px-4 pt-4 pb-12 md:px-8">
          <div className="mx-auto max-w-4xl">
            <ConsultationEditor
              consultationId={id}
              isFinalized={c.isFinalized}
              finalizedAt={c.finalizedAt}
              initialSections={{
                motif: c.motif ?? '',
                historyNotes: c.historyNotes ?? '',
                examNotes: c.examNotes ?? '',
                diagnosis: c.diagnosis ?? '',
                followUpNotes: c.followUpNotes ?? '',
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
              previousVitals={previousVitals}
              prescription={{
                prescriptionId: presc?.prescription.id ?? null,
                items: presc?.items ?? [],
                suggestions,
              }}
            />
          </div>
        </div>

        <AssistantDrawer>
          <AssistantPanel consultationId={id} state={assistantState} />
        </AssistantDrawer>
      </div>
    </CockpitProvider>
  );
}
