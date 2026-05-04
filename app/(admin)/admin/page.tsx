import { getGlobalUsageReport } from '@/lib/admin/queries';
import { StatCard } from '@/components/admin/stat-card';
import { UsageChart } from '@/components/admin/usage-chart';

export const dynamic = 'force-dynamic';

const PROVIDER_LABEL: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  mistral: 'Mistral',
};

export default async function AdminDashboardPage() {
  const r = await getGlobalUsageReport(30);
  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-xl font-semibold">Tableau de bord</h1>
      <p className="text-xs text-gray-500">30 derniers jours</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Cabinets actifs" value={String(r.activeTenants)} />
        <StatCard label="Crédits consommés" value={String(r.creditsConsumed30d)} hint="(débits)" />
        <StatCard
          label="Coût IA estimé"
          value={`$${r.estCostUsd30d.toFixed(2)}`}
          hint={`≈ ${(r.estCostUsd30d * 10).toFixed(2)} MAD`}
        />
        <StatCard
          label="Marge estimée"
          value={`${r.estMarginMad30d.toFixed(2)} MAD`}
          hint={`${r.marginPct}% sur ${r.estRevenueMad30d.toFixed(2)} MAD`}
        />
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Activité quotidienne</h2>
        <UsageChart daily={r.daily} />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Par fournisseur</h2>
        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-2">Fournisseur</th>
                <th className="text-left p-2">Cabinets</th>
                <th className="text-left p-2">Crédits</th>
                <th className="text-left p-2">Tokens (in/out)</th>
                <th className="text-left p-2">Coût USD</th>
                <th className="text-left p-2">Revenu MAD</th>
              </tr>
            </thead>
            <tbody>
              {r.perProvider.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-gray-500">
                    Pas encore d&apos;utilisation IA ce mois-ci.
                  </td>
                </tr>
              ) : (
                r.perProvider.map((p) => (
                  <tr key={p.provider} className="border-b">
                    <td className="p-2">{PROVIDER_LABEL[p.provider] ?? p.provider}</td>
                    <td className="p-2">{p.tenants}</td>
                    <td className="p-2">{p.creditsConsumed}</td>
                    <td className="p-2">{p.inputTokens.toLocaleString('fr-FR')} / {p.outputTokens.toLocaleString('fr-FR')}</td>
                    <td className="p-2">${p.estCostUsd.toFixed(2)}</td>
                    <td className="p-2">{p.estRevenueMad.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
