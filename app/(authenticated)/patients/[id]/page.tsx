import { notFound } from 'next/navigation';
import { IdCard, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { getPatientDetail } from '@/lib/patients/queries';
import { formatAge } from '@/lib/patients/age';
import { coverageLabel } from '@/lib/patients/coverage';
import { getLatestHistoryNote, listConsultationsForPatient } from '@/lib/consultations/queries';
import { PatientHistoryPanel } from '@/components/patients/patient-history-panel';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { Section } from '@/components/ui/section';
import { StatusBadge } from '@/components/ui/status-badge';
import { ClinicalLists } from './clinical-lists';
import { ConsultationTimeline } from './consultation-timeline';
import { FlashToast } from './flash-toast';
import { PatientFileActions } from './patient-file-actions';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
};

/**
 * Patient file = hub (UX brief §3.3). Name as the title, identity in the
 * meta line, RDV / salle d'attente up front. Left: the structured
 * antécédents panel (the main clinical block) and, for the doctor, the
 * allergy / chronic-condition editor. Right: consultations with their
 * follow-ups nested.
 */
export default async function PatientDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const flags = await searchParams;
  const session = await requireSession();
  const isDoctor = session.role === 'doctor';
  const [data, consultations, latestHistoryNote] = await Promise.all([
    getPatientDetail(session.tenantId, id),
    listConsultationsForPatient(session.tenantId, id),
    getLatestHistoryNote(session.tenantId, id),
  ]);
  if (!data) notFound();
  const p = data.patient;
  const fullName = `${p.lastName} ${p.firstName}`;
  const ageLabel = formatAge(p.dateOfBirth);

  const meta = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted-foreground">
      <span className="tabular-nums">
        {ageLabel} · {p.gender === 'm' ? 'Homme' : 'Femme'}
      </span>
      {p.phone ? (
        <a
          href={`tel:${p.phone.replace(/\s+/g, '')}`}
          className="inline-flex items-center gap-1 rounded-sm tabular-nums hover:text-foreground"
        >
          <Phone className="size-3.5" aria-hidden />
          {p.phone}
        </a>
      ) : null}
      {p.cin ? (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <IdCard className="size-3.5" aria-hidden />
          <span className="sr-only">CIN </span>
          {p.cin}
        </span>
      ) : null}
      {p.coverageType ? (
        <StatusBadge variant="info" icon={ShieldCheck}>
          {coverageLabel(p.coverageType)}
          {p.coverageId ? ` · ${p.coverageId}` : ''}
        </StatusBadge>
      ) : null}
      {p.isArchived ? <StatusBadge variant="neutral">Archivé</StatusBadge> : null}
    </div>
  );

  return (
    <>
      {flags.created === '1' ? <FlashToast title="Patient créé" description={fullName} /> : null}
      {flags.saved === '1' ? (
        <FlashToast title="Dossier enregistré" description={fullName} />
      ) : null}
      <PageHeader
        back={{ href: '/patients', label: 'Patients' }}
        title={fullName}
        description={meta}
        actions={
          <PatientFileActions
            patient={{ id: p.id, fullName, ageLabel, phone: p.phone }}
            isDoctor={isDoctor}
            isArchived={p.isArchived}
          />
        }
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
          <div className="space-y-6">
            <PatientHistoryPanel
              patientId={id}
              initial={{
                historyMedical: p.historyMedical ?? '',
                historySurgical: p.historySurgical ?? '',
                historyFamily: p.historyFamily ?? '',
                historyTreatments: p.historyTreatments ?? '',
                historyLifestyle: p.historyLifestyle ?? '',
              }}
              allergies={data.allergies.map((a) => a.label)}
              conditions={data.conditions.map((c) => c.label)}
              updatedAt={p.historyUpdatedAt}
              latestNote={latestHistoryNote}
              canEdit={isDoctor}
            />
            {isDoctor ? (
              <ClinicalLists
                patientId={id}
                allergies={data.allergies.map((a) => ({ id: a.id, label: a.label }))}
                conditions={data.conditions.map((c) => ({ id: c.id, label: c.label }))}
              />
            ) : null}
            {p.notes || p.address ? (
              <section aria-labelledby="patient-notes" className="panel space-y-3 p-4">
                <h2 id="patient-notes" className="text-heading font-semibold">
                  Informations pratiques
                </h2>
                {p.address ? (
                  <p className="flex items-start gap-1.5 text-body">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden />
                    {p.address}
                  </p>
                ) : null}
                {p.notes ? (
                  <p className="whitespace-pre-wrap text-body text-muted-foreground">{p.notes}</p>
                ) : null}
              </section>
            ) : null}
          </div>

          <Section title="Consultations et suivis" count={consultations.length}>
            <ConsultationTimeline items={consultations} canOpen={isDoctor} />
          </Section>
        </div>
      </PageBody>
    </>
  );
}
