import { createClient, hasSupabaseEnvironment } from '@/lib/supabase/server';
import {
  cleanTradeDate,
  cleanTradeNumber,
  cleanTradeTime,
  tradeImagePath,
  validateTradeImage,
} from '@/lib/trades';

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
    .from('trades')
    .select(
      'id, account_id, instrument, session, timeframe, trade_date, trade_time, direction, entry_price, stop_loss, exit_price, result_r, pnl, notes, image_path, post_image_path, outcome, completed_at, created_at',
    )
    .order('trade_date', { ascending: false })
    .order('trade_time', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const signedImages = await Promise.all(
    rows.map(async (row) => {
      const paths = [row.image_path, row.post_image_path];
      return Promise.all(
        paths.map(async (path) => {
          if (!path) return null;
          const { data: signed } = await supabase.storage
            .from('trade-images')
            .createSignedUrl(path, 3600);
          return signed?.signedUrl ?? null;
        }),
      );
    }),
  );

  return Response.json(
    rows.map((row, index) => ({
      id: row.id,
      accountId: row.account_id,
      instrument: row.instrument,
      session: row.session,
      timeframe: row.timeframe,
      tradeDate: row.trade_date,
      tradeTime: String(row.trade_time).slice(0, 5),
      direction: row.direction,
      entryPrice: Number(row.entry_price),
      stopLoss: Number(row.stop_loss),
      exitPrice: row.exit_price === null ? null : Number(row.exit_price),
      resultR: Number(row.result_r),
      pnl: Number(row.pnl),
      notes: row.notes,
      imageUrl: signedImages[index][0],
      postImageUrl: signedImages[index][1],
      outcome: row.outcome,
      completedAt: row.completed_at,
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
  const accountId = formData.get('accountId');
  const direction = formData.get('direction');
  const tradeDate = cleanTradeDate(formData.get('tradeDate'));
  const tradeTime = cleanTradeTime(formData.get('tradeTime'));
  const entryPrice = cleanTradeNumber(formData.get('entryPrice'), {
    positive: true,
  });
  const stopLoss = cleanTradeNumber(formData.get('stopLoss'), {
    positive: true,
  });
  const rawExitPrice = formData.get('exitPrice');
  const exitPrice =
    typeof rawExitPrice === 'string' && rawExitPrice.trim() === ''
      ? null
      : cleanTradeNumber(rawExitPrice, { positive: true });
  const invalidExitPrice =
    typeof rawExitPrice !== 'string' ||
    (rawExitPrice.trim() !== '' && exitPrice === null);
  const resultR = cleanTradeNumber(formData.get('resultR'), { limit: 100 });
  const pnl = cleanTradeNumber(formData.get('pnl'));
  const rawNotes = formData.get('notes');
  const notes =
    typeof rawNotes === 'string' ? rawNotes.trim().slice(0, 5000) : '';

  if (typeof accountId !== 'string' || !accountId.trim()) {
    return Response.json(
      { error: 'Select a trading account' },
      { status: 400 },
    );
  }
  if (direction !== 'Buy' && direction !== 'Sell') {
    return Response.json({ error: 'Choose Buy or Sell' }, { status: 400 });
  }
  if (!tradeDate || !tradeTime) {
    return Response.json(
      { error: 'Enter a valid date and 24-hour time' },
      { status: 400 },
    );
  }
  if (
    entryPrice === null ||
    stopLoss === null ||
    invalidExitPrice ||
    resultR === null ||
    pnl === null
  ) {
    return Response.json(
      { error: 'Check the trade prices, RR, and P&L' },
      { status: 400 },
    );
  }

  const image = formData.get('image');
  const imageError = validateTradeImage(image);
  if (imageError) return Response.json({ error: imageError }, { status: 400 });

  const id = crypto.randomUUID();
  let imagePath: string | null = null;
  if (image instanceof File && image.size > 0) {
    imagePath = tradeImagePath(user.id, image);
    const { error: uploadError } = await supabase.storage
      .from('trade-images')
      .upload(imagePath, image, { contentType: image.type, upsert: false });
    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }
  }

  const { error } = await supabase.from('trades').insert({
    id,
    user_id: user.id,
    account_id: accountId,
    instrument: 'GBPUSD',
    session: 'London',
    timeframe: '15m',
    trade_date: tradeDate,
    trade_time: tradeTime,
    direction,
    entry_price: entryPrice,
    stop_loss: stopLoss,
    exit_price: exitPrice,
    result_r: resultR,
    pnl,
    notes,
    image_path: imagePath,
  });

  if (error) {
    if (imagePath) {
      await supabase.storage.from('trade-images').remove([imagePath]);
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ id, status: 'saved' });
}
