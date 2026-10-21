import type { Metadata } from 'next';
import { sql } from 'drizzle-orm';
import { Server } from 'lucide-react';
import { dbAdmin } from '@/db/client';
import { PublicShell } from '@/components/auth/public-shell';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sous-traitants IA · Doctopus',
};

const PROVIDER_LABEL: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  mistral: 'Mistral AI',
};

export default async function SubprocessorsPage() {
  const rows = await dbAdmin().execute<{ provider: string | null; tenant_count: number }>(sql`
    SELECT chatbot_provider AS provider, COUNT(*)::int AS tenant_count
    FROM tenants
    WHERE chatbot_enabled = true AND chatbot_provider IS NOT NULL
    GROUP BY chatbot_provider
    ORDER BY chatbot_provider
  `);

  return (
    <PublicShell align="top">
      <article className="w-full max-w-3xl space-y-8 py-4 md:py-8">
        <header className="space-y-2">
          <p className="eyebrow">Transparence · Loi 09-08</p>
          <h1 className="text-display font-semibold text-foreground">
            Sous-traitants de l&apos;assistant IA
          </h1>
          <p className="max-w-prose text-body text-muted-foreground">
            Liste des fournisseurs d&apos;IA actuellement utilisés par les cabinets de la
            plateforme Doctopus.
          </p>
        </header>

        <section className="panel space-y-3 p-5 md:p-6">
          <h2 className="text-heading font-semibold text-foreground">Ce qui est transmis</h2>
          <ul className="list-disc space-y-2 pl-5 text-body text-foreground/85 marker:text-subtle-foreground">
            <li>
              Pour l&apos;assistant IA, Doctopus s&apos;appuie sur des fournisseurs tiers, qui
              agissent comme sous-traitants au sens de la loi 09-08.
            </li>
            <li>
              Seul le contexte clinique de la consultation est transmis, anonymisé : sans nom,
              CIN, téléphone ni adresse du patient.
            </li>
            <li>Aucune donnée n&apos;est utilisée pour entraîner leurs modèles.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-heading font-semibold text-foreground">Fournisseurs actifs</h2>
          <div className="panel overflow-hidden">
            {rows.length === 0 ? (
              <EmptyState
                icon={Server}
                title="Aucun sous-traitant actif"
                description="Aucun fournisseur d'IA n'est utilisé actuellement par les cabinets de la plateforme."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead className="text-right">Cabinets actifs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.provider}>
                      <TableCell className="font-medium">
                        {r.provider ? (PROVIDER_LABEL[r.provider] ?? r.provider) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.tenant_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <p className="text-small text-muted-foreground">
            Liste mise à jour automatiquement à partir de la configuration des cabinets.
          </p>
        </section>
      </article>
    </PublicShell>
  );
}
