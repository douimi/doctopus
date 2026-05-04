import { requireDoctor } from '@/lib/auth/guards';
import { listAuditLog } from '@/lib/audit/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ACTION_LABEL: Record<string, string> = {
  'auth.sign_in_success': 'Connexion',
  'auth.sign_in_failed': 'Échec connexion',
  'tenant.invite_created': 'Invitation créée',
  'tenant.invite_consumed': 'Invitation acceptée',
  'patient.create': 'Patient créé',
  'patient.update': 'Patient modifié',
  'patient.archive': 'Patient archivé',
  'consultation.start': 'Consultation démarrée',
  'consultation.finalize': 'Consultation terminée',
  'prescription.item_added': 'Médicament ajouté à l’ordonnance',
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
    <div className="max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Journal d&apos;audit</CardTitle>
        </CardHeader>
        <CardContent>
          {page.rows.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun événement enregistré.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left p-2 w-44">Date</th>
                  <th className="text-left p-2">Action</th>
                  <th className="text-left p-2">Entité</th>
                  <th className="text-left p-2">Acteur</th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{fmt(r.at)}</td>
                    <td className="p-2">{ACTION_LABEL[r.action] ?? r.action}</td>
                    <td className="p-2 text-xs text-gray-600">
                      {r.entityType ?? '—'} {r.entityId ? `#${r.entityId.slice(0, 8)}` : ''}
                    </td>
                    <td className="p-2 text-xs text-gray-600">
                      {r.actorUserId ? `#${r.actorUserId.slice(0, 8)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {page.hasMore ? (
            <p className="text-xs text-gray-500 mt-2">
              Plus de 100 entrées. La pagination complète sera ajoutée dans une version ultérieure.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
