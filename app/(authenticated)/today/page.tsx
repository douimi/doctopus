import { requireSession } from '@/lib/auth/session';

export default async function TodayPage() {
  const session = await requireSession();
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Bonjour {session.fullName}</h1>
      <p className="text-sm text-gray-600">
        L&apos;agenda et la salle d&apos;attente seront ajoutés dans le plan 1.B.
      </p>
    </div>
  );
}
