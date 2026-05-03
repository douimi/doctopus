import { sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';

export const dynamic = 'force-dynamic';

export default async function SubprocessorsPage() {
  const rows = await dbAdmin().execute<{ provider: string | null; tenant_count: number }>(sql`
    SELECT chatbot_provider AS provider, COUNT(*)::int AS tenant_count
    FROM tenants
    WHERE chatbot_enabled = true AND chatbot_provider IS NOT NULL
    GROUP BY chatbot_provider
    ORDER BY chatbot_provider
  `);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Sous-traitants — Assistant IA</h1>
      <p className="text-sm text-gray-700">
        Pour l&apos;assistant IA, Doctopus s&apos;appuie sur des fournisseurs d&apos;IA tiers
        comme sous-traitants au sens de la loi 09-08. Le contexte clinique du patient
        (anonymisé : sans nom, CIN, téléphone ni adresse) est transmis à ces sous-traitants
        pour générer les réponses. Aucune donnée n&apos;est utilisée pour entraîner leurs modèles.
      </p>
      <table className="w-full text-sm border rounded">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left p-2">Fournisseur</th>
            <th className="text-left p-2">Cabinets actifs</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="p-3 text-center text-gray-500">
                Aucun fournisseur actuellement utilisé.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.provider} className="border-b">
                <td className="p-2 capitalize">{r.provider}</td>
                <td className="p-2">{r.tenant_count}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
