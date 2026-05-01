import Link from 'next/link';
import { requireSession } from '@/lib/auth/session';
import { searchPatients } from '@/lib/patients/queries';
import { ageFromDob } from '@/lib/patients/age';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  searchParams: Promise<{ q?: string; archived?: string }>;
};

export default async function PatientsPage({ searchParams }: Props) {
  const session = await requireSession();
  const { q = '', archived } = await searchParams;
  const includeArchived = archived === '1';
  const rows = await searchPatients(session.tenantId, q, { includeArchived });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Patients</h1>
        <Link href="/patients/new" className={buttonVariants()}>
          Nouveau patient
        </Link>
      </div>

      <form className="flex items-center gap-2" action="/patients">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Recherche : nom, prénom, téléphone, CIN"
          className="max-w-md"
        />
        {includeArchived ? <input type="hidden" name="archived" value="1" /> : null}
        <Button type="submit" variant="secondary">
          Rechercher
        </Button>
        <Link
          href={
            includeArchived
              ? `/patients?q=${encodeURIComponent(q)}`
              : `/patients?q=${encodeURIComponent(q)}&archived=1`
          }
          className="text-sm underline"
        >
          {includeArchived ? 'Masquer archivés' : 'Voir archivés'}
        </Link>
      </form>

      <div className="border rounded-md">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="text-left p-2">Nom</th>
              <th className="text-left p-2">Prénom</th>
              <th className="text-left p-2">Âge</th>
              <th className="text-left p-2">Téléphone</th>
              <th className="text-left p-2">CIN</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Aucun patient.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className={p.isArchived ? 'opacity-60' : ''}>
                  <td className="p-2">{p.lastName}</td>
                  <td className="p-2">{p.firstName}</td>
                  <td className="p-2">{ageFromDob(p.dateOfBirth)} ans</td>
                  <td className="p-2">{p.phone ?? '—'}</td>
                  <td className="p-2">{p.cin ?? '—'}</td>
                  <td className="p-2 text-right">
                    <Link href={`/patients/${p.id}`} className="underline">
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
