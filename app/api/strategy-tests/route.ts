import { createClient, hasSupabaseEnvironment } from '@/lib/supabase/server';
import {
  cleanStrategy,
  cleanStrategyDate,
  cleanStrategyResult,
} from '@/lib/strategy-tests';

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
    .from('strategy_tests')
    .select('id, strategy, test_date, result_r, created_at')
    .eq('user_id', user.id)
    .order('test_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(
    (data ?? []).map((row) => ({
      id: row.id,
      strategy: row.strategy,
      testDate: row.test_date,
      resultR: Number(row.result_r),
      createdAt: row.created_at,
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

  const body = (await request.json().catch(() => null)) as {
    strategy?: unknown;
    testDate?: unknown;
    resultR?: unknown;
  } | null;
  const strategy = cleanStrategy(body?.strategy);
  const testDate = cleanStrategyDate(body?.testDate);
  if (!strategy || !testDate) {
    return Response.json(
      { error: 'Choose a strategy and valid date' },
      { status: 400 },
    );
  }
  const resultR = cleanStrategyResult(strategy, body?.resultR);
  if (resultR === null) {
    return Response.json(
      { error: `Invalid ${strategy} strategy result` },
      { status: 400 },
    );
  }

  const row = {
    id: crypto.randomUUID(),
    user_id: user.id,
    strategy,
    test_date: testDate,
    result_r: resultR,
  };
  const { data, error } = await supabase
    .from('strategy_tests')
    .insert(row)
    .select('id, strategy, test_date, result_r, created_at')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    id: data.id,
    strategy: data.strategy,
    testDate: data.test_date,
    resultR: Number(data.result_r),
    createdAt: data.created_at,
  });
}
