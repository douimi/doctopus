import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; dir?: string }>;
};

/**
 * Suivis now live as a tab of /consultations. Keep this route so old
 * links and bookmarks land on the filtered list, query params intact.
 */
export default async function FollowUpsPage({ searchParams }: Props) {
  const params = await searchParams;
  const sp = new URLSearchParams({ type: 'suivi' });
  for (const key of ['q', 'page', 'sort', 'dir'] as const) {
    const v = params[key];
    if (typeof v === 'string' && v.length > 0) sp.set(key, v);
  }
  redirect(`/consultations?${sp.toString()}`);
}
