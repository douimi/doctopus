import { History } from 'lucide-react';
import { requireDoctor } from '@/lib/auth/guards';
import { listAuditLog } from '@/lib/audit/queries';
import { PageHeader } from '@/components/shell/page-header';
import { Section } from '@/components/ui/section';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';

const ACTION_LABEL: Record<string, string> = {
  'auth.sign_in_success': 'Connexion',
  'auth.sign_in_failed': 'Échec connexion',
  'tenant.invite_created': 'Invitation créée',
  'tenant.invite_consumed': 'Invitation acceptée',
  'patient.create': 'Patient créé',
  'patient.update': 'Patient modifié',
  'patient.archive': 'Patient archivé',
  'consultation.start': 'Consultation démarrée',
  'consultation.manual_create': 'Consultation enregistrée manuellement',
  'consultation.followup_create': 'Suivi créé',
  'consultation.delete': 'Consultation supprimée',
  'consultation.finalize': 'Consultation terminée',
  'consultation.follow_up_updated': 'Suivi mis à jour',
  'prescription.item_added': "Médicament ajouté à l’ordonnance",
  'prescription.printed': 'Ordonnance imprimée',
  'admin.tenant.grant_credits': 'Crédits IA accordés (admin)',
  'admin.tenant.set_model': 'Modèle IA modifié (admin)',
  'admin.tenant.enable_chatbot': 'Assistant IA activé (admin)',
  'admin.tenant.disable_chatbot': 'Assistant IA désactivé (admin)',
  'admin.tenant.suspend': 'Cabinet suspendu (admin)',
  'admin.tenant.reactivate': 'Cabinet réactivé (admin)',
  'admin.invite.create': 'Invitation médecin créée (admin)',
  'admin.invite.revoke': 'Invitation révoquée (admin)',
};

function fmt(d: Date): string {
  return d.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default async function AuditPage() {
  const session = await requireDoctor();
  const page = await listAuditLog(session.tenantId, { limit: 100 });

  return (
    <>
      <PageHeader
        title="Journal d'audit"
        description="Trace de toutes les actions effectuées sur votre cabinet."
      />
      <div className="px-6 py-6 space-y-4">
        <Section icon={History} title="Événements récents" count={page.rows.length}>
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>Acteur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.rows.length === 0 ? (
                  <TableEmpty colSpan={4}>
                    <EmptyState
                      icon={History}
                      title="Aucun événement"
                      description="Aucun événement enregistré pour l'instant."
                    />
                  </TableEmpty>
                ) : (
                  page.rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-small text-muted-foreground tabular-nums">
                        {fmt(r.at)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {ACTION_LABEL[r.action] ?? r.action}
                      </TableCell>
                      <TableCell className="text-small text-muted-foreground tabular-nums">
                        {r.entityType ?? '—'}{' '}
                        {r.entityId ? (
                          <code className="text-small">#{r.entityId.slice(0, 8)}</code>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-small text-muted-foreground tabular-nums">
                        {r.actorUserId ? (
                          <code className="text-small">#{r.actorUserId.slice(0, 8)}</code>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {page.hasMore ? (
            <p className="text-small text-muted-foreground">
              Plus de 100 entrées. La pagination complète sera ajoutée dans une version ultérieure.
            </p>
          ) : null}
        </Section>
      </div>
    </>
  );
}
