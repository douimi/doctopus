import { Building2, Users } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { PageBreadcrumb } from '@/components/shell/page-breadcrumb';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';
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

export const dynamic = 'force-dynamic';

export default function DesignShowcasePage() {
  return (
    <div>
      <PageBreadcrumb items={[{ label: 'Admin', href: '/admin' }, { label: 'Design system' }]} />
      <PageHeader
        title="Design system"
        description="Living showcase of every primitive and pattern in the Phase A foundation."
      />
      <div className="px-6 py-6 space-y-10 max-w-5xl">

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Color tokens</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-small">
            {[
              ['primary', 'Primary (sky-600)'],
              ['admin', 'Admin (orange-600)'],
              ['success', 'Success (green-600)'],
              ['warning', 'Warning (amber-500)'],
              ['danger', 'Danger (red-600)'],
              ['info', 'Info (sky-600)'],
              ['muted', 'Muted'],
              ['border', 'Border'],
            ].map(([token, label]) => (
              <div key={token} className="space-y-1">
                <div
                  className="h-12 rounded-md border border-border"
                  style={{ backgroundColor: `var(--${token})` }}
                />
                <div className="text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Typography</h2>
          <div className="space-y-2">
            <p className="text-display font-semibold">Display 30/36</p>
            <p className="text-title font-medium">Title 20/28</p>
            <p className="text-heading font-medium">Heading 16/24</p>
            <p className="text-body">Body 14/20 — corps de texte par défaut.</p>
            <p className="text-small text-muted-foreground">Small 12/16 — captions et labels.</p>
            <p className="tabular-nums text-body">Tabular: 1,234,567.89</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="xs">Xs</Button>
            <Button size="sm">Sm</Button>
            <Button>Default</Button>
            <Button size="lg">Lg</Button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Status badges</h2>
          <div className="flex flex-wrap gap-2">
            <StatusBadge variant="success">actif</StatusBadge>
            <StatusBadge variant="warning">en attente</StatusBadge>
            <StatusBadge variant="danger">suspendu</StatusBadge>
            <StatusBadge variant="info">info</StatusBadge>
            <StatusBadge variant="neutral">expirée</StatusBadge>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Alerts</h2>
          <div className="space-y-2">
            <Alert variant="info" title="Information">Texte d&apos;information.</Alert>
            <Alert variant="success" title="Succès">L&apos;opération est terminée.</Alert>
            <Alert variant="warning" title="Attention">Vérifiez avant de continuer.</Alert>
            <Alert variant="danger" title="Erreur">Une erreur est survenue.</Alert>
            <Alert variant="danger">Sans titre — message inline.</Alert>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Empty states</h2>
          <Card>
            <CardContent>
              <EmptyState
                icon={Users}
                title="Aucun patient"
                description="Ajoutez votre premier patient pour commencer."
                action={<Button>Nouveau patient</Button>}
              />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Skeletons</h2>
          <Card>
            <CardHeader><CardTitle>TableSkeleton</CardTitle></CardHeader>
            <CardContent>
              <TableSkeleton rows={4} columns={4} />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Form pattern</h2>
          <Card>
            <CardHeader><CardTitle>Exemple de formulaire</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4">
                <FormField label="Email" description="On ne le partage avec personne.">
                  <Input type="email" />
                </FormField>
                <FormField label="Mot de passe" error="Mot de passe trop court.">
                  <Input type="password" defaultValue="abc" />
                </FormField>
                <Button>Soumettre</Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Tables</h2>
          <Card>
            <CardContent className="p-0">
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
                    <TableCell><StatusBadge variant="success">actif</StatusBadge></TableCell>
                    <TableCell className="text-right tabular-nums">42</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Cabinet Test</TableCell>
                    <TableCell><StatusBadge variant="danger">suspendu</StatusBadge></TableCell>
                    <TableCell className="text-right tabular-nums">0</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Empty</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>A</TableHead>
                    <TableHead>B</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableEmpty colSpan={2}>
                    <EmptyState icon={Building2} title="Aucun cabinet" />
                  </TableEmpty>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}
