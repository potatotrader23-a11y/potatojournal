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
    maePips: Math.max(0, number('maePips')),
    asianPosition: pick('asianPosition'),
    breakoutCandle: pick('breakoutCandle'),
    asianRangePriceAction: pick('asianRangePriceAction'),
    imbalance: pick('imbalance'),
    insideHigherHighOrLow: boolean('insideHigherHighOrLow'),
    structureBreakDuringTrade: boolean('structureBreakDuringTrade'),
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
    .select('id, instrument, variables, image_path, created_at')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const signedImages = await Promise.all(
    rows.map(async (row) => {
      if (!row.image_path) return null;
      const { data: signed } = await supabase.storage
        .from('backtest-images')
        .createSignedUrl(row.image_path, 3600);
      return signed?.signedUrl ?? null;
    }),
  );

  return Response.json(
    rows.map((row, index) => ({
      id: row.id,
      instrument: row.instrument,
      variables: row.variables,
      imageUrl: signedImages[index],
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

  const formData = await request.formData();
  const variablesValue = formData.get('variables');
  let variables: unknown = {};
  if (typeof variablesValue === 'string') {
    try {
      variables = JSON.parse(variablesValue);
    } catch {
      return Response.json({ error: 'Invalid variables' }, { status: 400 });
    }
  }

  const image = formData.get('image');
  const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (
    image instanceof File &&
    (image.size > 5 * 1024 * 1024 || !acceptedTypes.has(image.type))
  ) {
    return Response.json(
      { error: 'Image must be a PNG, JPEG, or WebP under 5 MB' },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  let imagePath: string | null = null;
  if (image instanceof File && image.size > 0) {
    const extension =
      image.type === 'image/png'
        ? 'png'
        : image.type === 'image/webp'
          ? 'webp'
          : 'jpg';
    imagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('backtest-images')
      .upload(imagePath, image, { contentType: image.type, upsert: false });
    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }
  }

  const { error } = await supabase.from('backtests').insert({
    id,
    user_id: user.id,
    account_id: null,
    instrument: 'GBPUSD',
    assumptions: {},
    variables: cleanVariables(variables),
    results: {},
    image_path: imagePath,
  });

  if (error) {
    if (imagePath) {
      await supabase.storage.from('backtest-images').remove([imagePath]);
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ id, status: 'saved' });
}
