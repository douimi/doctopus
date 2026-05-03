import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${env().CRON_SECRET}`;
  if (auth !== expected) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const result = await dbAdmin().execute(sql`
    DELETE FROM tenant_invites
    WHERE consumed_at IS NULL
      AND expires_at < now() - interval '30 days'
    RETURNING id
  `);
  const deleted = (result as unknown as Array<{ id: string }>).length;

  return NextResponse.json({ deleted });
}
