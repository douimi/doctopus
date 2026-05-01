import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { getPatientDetail } from '@/lib/patients/queries';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PatientCard } from '@/components/patients/patient-card';
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

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/patients" className="text-sm underline">
          ← Patients
        </Link>
        <div className="flex gap-2">
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
        </div>
      </div>

      <PatientCard
        patient={data.patient}
        allergies={data.allergies}
        conditions={data.conditions}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border p-3 space-y-2">
          <div className="font-medium">Allergies</div>
          <ul className="space-y-1">
            {data.allergies.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span>{a.label}</span>
                <form action={removeAllergyAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="patientId" value={id} />
                  <button type="submit" className="text-xs text-red-600 underline">
                    retirer
                  </button>
                </form>
              </li>
            ))}
            {data.allergies.length === 0 ? (
              <li className="text-sm text-gray-500">Aucune.</li>
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

        <div className="rounded-md border p-3 space-y-2">
          <div className="font-medium">Antécédents / chroniques</div>
          <ul className="space-y-1">
            {data.conditions.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span>{c.label}</span>
                <form action={removeConditionAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="patientId" value={id} />
                  <button type="submit" className="text-xs text-red-600 underline">
                    retirer
                  </button>
                </form>
              </li>
            ))}
            {data.conditions.length === 0 ? (
              <li className="text-sm text-gray-500">Aucun.</li>
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
    </div>
  );
}
