import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { getPatientDetail } from '@/lib/patients/queries';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PatientCard } from '@/components/patients/patient-card';
import { listConsultationsForPatient } from '@/lib/consultations/queries';
import { PastConsultationsList } from '@/components/consultations/past-consultations-list';
import { PageHeader } from '@/components/shell/page-header';
import { archivePatientAction } from './actions';
import { addAllergyAction, removeAllergyAction } from './allergies/actions';
import { addConditionAction, removeConditionAction } from './conditions/actions';

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getPatientDetail(session.tenantId, id);
  if (!data) notFound();
  const consultations = await listConsultationsForPatient(session.tenantId, id);

  return (
    <>
      <PageHeader
        title="Fiche patient"
        actions={
          <>
            <Link href="/patients" className="text-sm underline">
              ← Patients
            </Link>
            <Link href={`/patients/${id}/edit`} className={buttonVariants({ variant: 'secondary' })}>
              Modifier
            </Link>
            {!data.patient.isArchived ? (
              <form action={archivePatientAction}>
                <input type="hidden" name="id" value={id} />
                <Button type="submit" variant="destructive">
                  Archiver
                </Button>
              </form>
            ) : null}
          </>
        }
      />

      <div className="px-6 py-6 space-y-4 max-w-3xl">
        <PatientCard
          patient={data.patient}
          allergies={data.allergies}
          conditions={data.conditions}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-md border border-border p-3 space-y-2">
            <div className="font-medium">Allergies</div>
            <ul className="space-y-1">
              {data.allergies.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span>{a.label}</span>
                  <form action={removeAllergyAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="patientId" value={id} />
                    <button type="submit" className="text-xs text-danger underline">
                      retirer
                    </button>
                  </form>
                </li>
              ))}
              {data.allergies.length === 0 ? (
                <li className="text-sm text-muted-foreground">Aucune.</li>
              ) : null}
            </ul>
            <form action={addAllergyAction} className="flex items-end gap-2 pt-2">
              <input type="hidden" name="patientId" value={id} />
              <div className="flex-1 space-y-1">
                <Label htmlFor="allergy-label" className="text-xs">
                  Ajouter
                </Label>
                <Input id="allergy-label" name="label" placeholder="ex. Pénicilline" required />
              </div>
              <Button type="submit" size="sm">
                +
              </Button>
            </form>
          </div>

          <div className="rounded-md border border-border p-3 space-y-2">
            <div className="font-medium">Antécédents / chroniques</div>
            <ul className="space-y-1">
              {data.conditions.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span>{c.label}</span>
                  <form action={removeConditionAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="patientId" value={id} />
                    <button type="submit" className="text-xs text-danger underline">
                      retirer
                    </button>
                  </form>
                </li>
              ))}
              {data.conditions.length === 0 ? (
                <li className="text-sm text-muted-foreground">Aucun.</li>
              ) : null}
            </ul>
            <form action={addConditionAction} className="flex items-end gap-2 pt-2">
              <input type="hidden" name="patientId" value={id} />
              <div className="flex-1 space-y-1">
                <Label htmlFor="condition-label" className="text-xs">
                  Ajouter
                </Label>
                <Input id="condition-label" name="label" placeholder="ex. HTA, diabète…" required />
              </div>
              <Button type="submit" size="sm">
                +
              </Button>
            </form>
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="font-medium">Consultations antérieures</h2>
          <PastConsultationsList items={consultations} />
        </section>
      </div>
    </>
  );
}
