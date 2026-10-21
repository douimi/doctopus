import type { ReactNode } from 'react';
import { Building2, Users } from 'lucide-react';
import { PageBody } from '@/components/shell/page-body';
import { PageHeader } from '@/components/shell/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterPill } from '@/components/ui/filter-pill';
import { FormField } from '@/components/ui/form-field';
import { FormSection } from '@/components/ui/form-section';
import { Input } from '@/components/ui/input';
import { SegmentedControl, SegmentedControlLink } from '@/components/ui/segmented-control';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDemo } from './confirm-demo';

export const dynamic = 'force-dynamic';

function Block({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="text-heading font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-small text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

const COLORS: Array<[string, string]> = [
  ['primary', 'Primary · sky-700'],
  ['success', 'Success · emerald-600'],
  ['warning', 'Warning · amber'],
  ['danger', 'Danger · red-600'],
  ['info', 'Info'],
  ['admin', 'Admin · orange (admin seulement)'],
  ['canvas', 'Canvas · slate-50'],
  ['muted', 'Muted · slate-100'],
  ['border', 'Border · slate-200'],
  ['foreground', 'Encre · slate-900'],
];

const TONES = ['primary', 'success', 'warning', 'danger', 'info'] as const;

export default function DesignShowcasePage() {
  return (
    <>
      <PageHeader
        eyebrow="Interne"
        title="Design system"
        description="Vitrine des primitives « Quiet clinical » : tokens, composants et motifs de page."
      />
      <PageBody className="space-y-10">
        <Block title="Couleurs" description="La couleur porte un état, jamais une décoration.">
          <div className="grid grid-cols-2 gap-3 text-small sm:grid-cols-3 md:grid-cols-5">
            {COLORS.map(([token, label]) => (
              <div key={token} className="space-y-1.5">
                <div
                  className="h-12 rounded-lg border border-border"
                  style={{ backgroundColor: `var(--${token})` }}
                />
                <div className="text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <span
                key={t}
                className="rounded-md px-2 py-1 text-small font-medium"
                style={{ backgroundColor: `var(--${t}-tint)`, color: `var(--${t}-ink)` }}
              >
                {t}-ink sur {t}-tint
              </span>
            ))}
          </div>
        </Block>

        <Block
          title="Typographie"
          description="Quatre niveaux ; la hiérarchie vient du poids et de la couleur."
        >
          <div className="panel space-y-2 p-5">
            <p className="text-display font-semibold">Display 24/32 · titre de page</p>
            <p className="text-title font-semibold">Title 18/24 · titre de bloc</p>
            <p className="text-heading font-semibold">Heading 15/22 · titre de section</p>
            <p className="text-body">Body 14/22 · corps de texte par défaut.</p>
            <p className="text-small text-muted-foreground">Small 13/18 · méta, aides, erreurs.</p>
            <p className="eyebrow">Eyebrow 11/16 · en-têtes de colonnes</p>
            <p className="text-body tabular-nums">Chiffres tabulaires : 1 234 567,89</p>
          </div>
        </Block>

        <Block
          title="Boutons"
          description="Un seul bouton principal par zone ; les actions voisines en secondaire."
        >
          <div className="flex flex-wrap gap-2">
            <Button>Principal</Button>
            <Button variant="secondary">Secondaire</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructif</Button>
            <Button variant="destructive-solid">Destructif plein</Button>
            <Button variant="link">Lien</Button>
            <Button loading>Chargement</Button>
            <Button disabled>Désactivé</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs">Xs</Button>
            <Button size="sm">Sm</Button>
            <Button>Default</Button>
            <Button size="lg">Lg</Button>
          </div>
        </Block>

        <Block title="Badges de statut">
          <div className="flex flex-wrap gap-2">
            <StatusBadge variant="success">Actif</StatusBadge>
            <StatusBadge variant="warning" dot>
              En attente
            </StatusBadge>
            <StatusBadge variant="danger">Suspendu</StatusBadge>
            <StatusBadge variant="info" dot>
              En consultation
            </StatusBadge>
            <StatusBadge variant="neutral">Expirée</StatusBadge>
          </div>
        </Block>

        <Block title="Filtres et vues">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5">
              <FilterPill href="/admin/design" active>
                Tous
              </FilterPill>
              <FilterPill href="/admin/design" active={false}>
                Actifs
              </FilterPill>
            </div>
            <SegmentedControl label="Période">
              <SegmentedControlLink href="/admin/design" active>
                7 jours
              </SegmentedControlLink>
              <SegmentedControlLink href="/admin/design" active={false}>
                30 jours
              </SegmentedControlLink>
            </SegmentedControl>
          </div>
        </Block>

        <Block title="Indicateurs" description="Neutres par défaut ; une teinte seulement si le chiffre demande de l'attention.">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Consultations" value="128" hint="ce mois-ci" />
            <StatCard
              label="Recettes"
              value="24 300 MAD"
              comparison={{ ratio: 0.12, label: 'vs mois dernier' }}
            />
            <StatCard label="En attente" value="3" tone="warning" hint="patients" />
            <StatCard label="Impayés" value="2" tone="danger" />
          </div>
        </Block>

        <Block title="Alertes">
          <div className="space-y-2">
            <Alert variant="info" title="Information">
              Texte d&apos;information.
            </Alert>
            <Alert variant="success" title="Succès">
              L&apos;opération est terminée.
            </Alert>
            <Alert variant="warning" title="Attention">
              Vérifiez avant de continuer.
            </Alert>
            <Alert variant="danger" title="Erreur">
              Une erreur est survenue.
            </Alert>
          </div>
        </Block>

        <Block
          title="Confirmations et retours"
          description="Toute action destructive passe par une confirmation ; tout succès donne un toast."
        >
          <ConfirmDemo />
        </Block>

        <Block title="Formulaire">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Exemple de formulaire</CardTitle>
              <CardDescription>Libellés au-dessus, aides et erreurs en dessous.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                <FormSection title="Identité">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Nom">
                      <Input defaultValue="El Idrissi" />
                    </FormField>
                    <FormField label="Prénom">
                      <Input defaultValue="Amina" />
                    </FormField>
                  </div>
                </FormSection>
                <FormSection title="Connexion">
                  <FormField label="Email" optional hint="Utilisé pour la connexion.">
                    <Input type="email" />
                  </FormField>
                  <FormField label="Mot de passe" error="Au moins 12 caractères.">
                    <Input type="password" defaultValue="abc" />
                  </FormField>
                </FormSection>
              </form>
            </CardContent>
            <CardFooter>
              <Button variant="secondary">Annuler</Button>
              <Button>Enregistrer</Button>
            </CardFooter>
          </Card>
        </Block>

        <Block title="Tableaux">
          <div className="panel overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cabinet</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Crédits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Cabinet El Idrissi</TableCell>
                  <TableCell>
                    <StatusBadge variant="success">Actif</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">42</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Cabinet Test</TableCell>
                  <TableCell>
                    <StatusBadge variant="danger">Suspendu</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">0</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="panel overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>A</TableHead>
                  <TableHead>B</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableEmpty colSpan={2}>
                  <EmptyState
                    icon={Building2}
                    title="Aucun cabinet"
                    description="État vide dans un tableau."
                  />
                </TableEmpty>
              </TableBody>
            </Table>
          </div>
        </Block>

        <Block title="États vides et chargement">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="panel">
              <EmptyState
                icon={Users}
                title="Aucun patient"
                description="Ajoutez votre premier patient pour commencer."
                action={<Button size="sm">Nouveau patient</Button>}
              />
            </div>
            <div className="panel space-y-3 p-4">
              <Skeleton className="h-5 w-40" />
              <TableSkeleton rows={4} columns={3} />
            </div>
          </div>
        </Block>
      </PageBody>
    </>
  );
}
