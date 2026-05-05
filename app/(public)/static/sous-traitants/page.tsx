import { sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { EmptyState } from '@/components/ui/empty-state';
import { Server } from 'lucide-react';

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
      <h1 className="text-title font-semibold">Sous-traitants — Assistant IA</h1>
      <p className="text-body text-muted-foreground">
        Pour l&apos;assistant IA, Doctopus s&apos;appuie sur des fournisseurs d&apos;IA tiers
        comme sous-traitants au sens de la loi 09-08. Le contexte clinique du patient
        (anonymisé : sans nom, CIN, téléphone ni adresse) est transmis à ces sous-traitants
        pour générer les réponses. Aucune donnée n&apos;est utilisée pour entraîner leurs modèles.
      </p>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-card">
          <EmptyState
            icon={Server}
            title="Aucun sous-traitant actif"
            description="Aucun fournisseur d'IA n'est utilisé actuellement par les cabinets de la plateforme."
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <table className="w-full text-body">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left p-3 font-medium">Fournisseur</th>
                <th className="text-left p-3 font-medium">Cabinets actifs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.provider} className="border-b border-border last:border-b-0">
                  <td className="p-3 capitalize">{r.provider}</td>
                  <td className="p-3 tabular-nums">{r.tenant_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
