import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { requireSession } from '@/lib/auth/session';
import { EMPTY_PATIENT, PatientForm } from '../patient-form';
import { createPatientAction } from './actions';

type Props = { searchParams: Promise<{ next?: string }> };

function safeNext(next: string | undefined): string {
  return next && /^\/[^\s/][^\s]*$/.test(next) ? next : '';
}

export default async function NewPatientPage({ searchParams }: Props) {
  await requireSession();
  const next = safeNext((await searchParams).next);
  const back =
    next.startsWith('/today/book')
      ? { href: next, label: 'Nouveau rendez-vous' }
      : next.startsWith('/today/walk-in')
        ? { href: next, label: "Salle d'attente" }
        : next
          ? { href: next, label: 'Retour' }
          : { href: '/patients', label: 'Patients' };

  return (
    <>
      <PageHeader
        width="narrow"
        back={back}
        title="Nouveau patient"
        description={
          next
            ? 'Créez le dossier ; vous reviendrez ensuite à votre démarche avec ce patient sélectionné.'
            : "Créez le dossier d'un nouveau patient pour votre cabinet."
        }
      />
      <PageBody width="narrow">
        <PatientForm
          action={createPatientAction}
          defaults={EMPTY_PATIENT}
          hidden={next ? { next } : undefined}
          submitLabel="Créer le patient"
          cancelHref={back.href}
        />
      </PageBody>
    </>
  );
}
