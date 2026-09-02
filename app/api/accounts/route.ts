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
    .from('accounts')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(
    (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.account_type,
      platform: row.platform,
      currency: row.currency,
      balance: Number(row.balance),
      startingBalance: Number(row.starting_balance),
      riskPercent: Number(row.risk_percent),
      dailyLossPercent: Number(row.daily_loss_percent),
      maxLossPercent: Number(row.max_loss_percent),
      pnl: Number(row.pnl),
      equity: row.equity,
    })),
  );
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
  const id = textValue(body.id, crypto.randomUUID());
  const row = {
    id,
    user_id: user.id,
    name: textValue(body.name, 'Trading account'),
    account_type: textValue(body.type, 'Personal'),
    platform: textValue(body.platform, ''),
    currency: textValue(body.currency, 'USD'),
    balance: Number(body.balance || 0),
    starting_balance: Number(body.startingBalance || body.balance || 0),
    risk_percent: Number(body.riskPercent || 0),
    daily_loss_percent: Number(body.dailyLossPercent || 0),
    max_loss_percent: Number(body.maxLossPercent || 0),
    pnl: Number(body.pnl || 0),
    equity: body.equity || [100, 100],
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('accounts')
    .upsert(row, { onConflict: 'user_id,id' });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id, status: 'saved' });
}
