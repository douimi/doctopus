import { NextResponse } from 'next/server';
import { requireDoctor } from '@/lib/auth/guards';
import { searchMedications } from '@/lib/medications/queries';

export const runtime = 'nodejs';

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireDoctor();
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const query = (url.searchParams.get('q') ?? '').trim();
  if (query.length < 2) {
    return NextResponse.json({ ok: true, hits: [] });
  }

  try {
    const hits = await searchMedications(query);
    return NextResponse.json({ ok: true, hits });
  } catch {
    return NextResponse.json({
      ok: false,
      error: 'Service de recherche temporairement indisponible.',
    });
  }
}
