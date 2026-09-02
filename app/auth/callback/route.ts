import { NextResponse } from 'next/server';
import { createClient, hasSupabaseEnvironment } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (code && hasSupabaseEnvironment()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/', url.origin));
  }

  return NextResponse.redirect(
    new URL('/login?error=Unable%20to%20complete%20sign-in', url.origin),
  );
}
