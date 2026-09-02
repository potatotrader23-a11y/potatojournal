import { createClient, hasSupabaseEnvironment } from '@/lib/supabase/server';

const textValue = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value : fallback;

export async function GET() {
  if (!hasSupabaseEnvironment()) {
    return Response.json(
      { error: 'Supabase is not configured' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('backtests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  if (!hasSupabaseEnvironment()) {
    return Response.json(
      { error: 'Supabase is not configured' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const id = crypto.randomUUID();
  const { error } = await supabase.from('backtests').insert({
    id,
    user_id: user.id,
    account_id: textValue(body.accountId, ''),
    instrument: textValue(body.instrument, 'Unknown'),
    assumptions: body.assumptions || {},
    results: body.results || {},
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id, status: 'saved' });
}
