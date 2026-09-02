import { createClient, hasSupabaseEnvironment } from '@/lib/supabase/server';

const choices = {
  structureBreakTiming: ['inside-london', 'outside-london'],
  entryHalf: ['first-half', 'second-half'],
  asianPosition: ['break-high', 'break-low', 'inside-session'],
  breakoutCandle: [
    'large-strong',
    'large-wicky',
    'medium-strong',
    'medium-wicky',
    'small-strong',
    'small-wicky',
  ],
  asianRangePriceAction: ['downtrend', 'uptrend', 'sideways', 'choppy'],
  imbalance: ['one-candle', 'two-candle', 'three-candle', 'deep-retracement'],
} as const;

const cleanVariables = (value: unknown) => {
  const input =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  const pick = (key: keyof typeof choices) => {
    const candidate = input[key];
    return typeof candidate === 'string' &&
      (choices[key] as readonly string[]).includes(candidate)
      ? candidate
      : choices[key][0];
  };
  const number = (key: string) => {
    const candidate = Number(input[key]);
    return Number.isFinite(candidate) ? candidate : 0;
  };
  const boolean = (key: string) => input[key] === true;

  return {
    structureBreakTiming: pick('structureBreakTiming'),
    entryHalf: pick('entryHalf'),
    closeAfterSession: boolean('closeAfterSession'),
    maePips: Math.max(0, number('maePips')),
    asianPosition: pick('asianPosition'),
    breakoutCandle: pick('breakoutCandle'),
    asianRangePriceAction: pick('asianRangePriceAction'),
    imbalance: pick('imbalance'),
    insideHigherHighOrLow: boolean('insideHigherHighOrLow'),
    structureBreakDuringTrade: boolean('structureBreakDuringTrade'),
    skipIfGapUntagged: boolean('skipIfGapUntagged'),
    tradeWithinTradingHours: boolean('tradeWithinTradingHours'),
  };
};

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
    account_id: null,
    instrument: 'GBPUSD',
    assumptions: body.assumptions || {},
    variables: cleanVariables(body.variables),
    results: body.results || {},
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id, status: 'saved' });
}
