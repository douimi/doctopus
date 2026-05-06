import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export async function POST() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  // Status 303 = "See Other" — instructs the browser to follow the redirect
  // with GET, even though the original request was POST. NextResponse.redirect
  // defaults to 307 which preserves POST and would 405 against the sign-in page.
  return NextResponse.redirect(new URL('/sign-in', env().APP_URL), { status: 303 });
}
