import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  HeartPulse,
  Pencil,
  Plus,
  X,
} from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { getPatientDetail } from '@/lib/patients/queries';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        eyebrow={
          <Link
            href="/patients"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            style={{ transitionDuration: 'var(--duration-fast)' }}
          >
            <ArrowLeft className="size-3" aria-hidden />
            Patients
          </Link>
        }
        title="Fiche patient"
        actions={
          <>
            <Link
              href={`/patients/${id}/edit`}
              className={buttonVariants({ variant: 'secondary' })}
            >
              <Pencil aria-hidden />
              Modifier
            </Link>
            {!data.patient.isArchived ? (
              <form action={archivePatientAction}>
                <input type="hidden" name="id" value={id} />
                <Button type="submit" variant="destructive">
                  <Archive aria-hidden />
                  Archiver
                </Button>
              </form>
            ) : null}
          </>
        }
      />

      <div className="px-6 py-6 space-y-4 max-w-6xl">
        <PatientCard
          patient={data.patient}
          allergies={data.allergies}
          conditions={data.conditions}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-danger" aria-hidden />
                Allergies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="space-y-1">
                {data.allergies.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 text-body py-1"
                  >
                    <span className="truncate">{a.label}</span>
                    <form action={removeAllergyAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="patientId" value={id} />
                      <Button
                        type="submit"
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Retirer ${a.label}`}
                        title="Retirer"
                        className="text-muted-foreground hover:text-danger"
                      >
                        <X aria-hidden />
                      </Button>
                    </form>
                  </li>
                ))}
                {data.allergies.length === 0 ? (
                  <li className="text-small text-muted-foreground italic">
                    Aucune allergie connue.
                  </li>
                ) : null}
              </ul>
              <form
                action={addAllergyAction}
                className="flex items-end gap-2 pt-2 border-t border-border"
              >
                <input type="hidden" name="patientId" value={id} />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="allergy-label" className="text-small">
                    Ajouter
                  </Label>
                  <Input
                    id="allergy-label"
                    name="label"
                    placeholder="ex. Pénicilline"
                    required
                  />
                </div>
                <Button type="submit" size="default" aria-label="Ajouter une allergie">
                  <Plus aria-hidden />
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartPulse className="size-4 text-warning" aria-hidden />
                Antécédents / chroniques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="space-y-1">
                {data.conditions.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 text-body py-1"
                  >
                    <span className="truncate">{c.label}</span>
                    <form action={removeConditionAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="patientId" value={id} />
                      <Button
                        type="submit"
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Retirer ${c.label}`}
                        title="Retirer"
                        className="text-muted-foreground hover:text-danger"
                      >
                        <X aria-hidden />
                      </Button>
                    </form>
                  </li>
                ))}
                {data.conditions.length === 0 ? (
                  <li className="text-small text-muted-foreground italic">
                    Aucun antécédent.
                  </li>
                ) : null}
              </ul>
              <form
                action={addConditionAction}
                className="flex items-end gap-2 pt-2 border-t border-border"
              >
                <input type="hidden" name="patientId" value={id} />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="condition-label" className="text-small">
                    Ajouter
                  </Label>
                  <Input
                    id="condition-label"
                    name="label"
                    placeholder="ex. HTA, diabète…"
                    required
                  />
                </div>
                <Button type="submit" size="default" aria-label="Ajouter un antécédent">
                  <Plus aria-hidden />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-3">
          <h2 className="text-heading font-semibold">Consultations antérieures</h2>
          <PastConsultationsList items={consultations} />
        </section>
      </div>
    </>
  );
}
