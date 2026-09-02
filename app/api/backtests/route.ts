import { createClient, hasSupabaseEnvironment } from '@/lib/supabase/server';
import {
  backtestImagePath,
  cleanBacktestDate,
  cleanBacktestVariables,
  cleanResultR,
  parseVariables,
  validateBacktestImage,
} from '@/lib/backtests';

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
    .select(
      'id, instrument, variables, results, image_path, backtest_date, created_at',
    )
    .order('backtest_date', { ascending: false })
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
      variables: cleanBacktestVariables(row.variables),
      resultR:
        row.results &&
        typeof row.results === 'object' &&
        'resultR' in row.results
          ? Number(row.results.resultR) || 0
          : 0,
      imageUrl: signedImages[index],
      backtestDate: row.backtest_date,
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
  const variables = parseVariables(formData.get('variables'));
  if (variables === null)
    return Response.json({ error: 'Invalid variables' }, { status: 400 });

  const image = formData.get('image');
  const imageError = validateBacktestImage(image);
  if (imageError) return Response.json({ error: imageError }, { status: 400 });
  const backtestDate = cleanBacktestDate(formData.get('backtestDate'));
  if (!backtestDate)
    return Response.json({ error: 'Invalid backtest date' }, { status: 400 });

  const id = crypto.randomUUID();
  let imagePath: string | null = null;
  if (image instanceof File && image.size > 0) {
    imagePath = backtestImagePath(user.id, image);
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
    variables: cleanBacktestVariables(variables),
    results: { resultR: cleanResultR(formData.get('resultR')) },
    backtest_date: backtestDate,
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
