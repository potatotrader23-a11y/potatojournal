import { createClient, hasSupabaseEnvironment } from '@/lib/supabase/server';
import {
  cleanTradeNumber,
  tradeImagePath,
  validateTradeImage,
} from '@/lib/trades';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const { data: trade, error: findError } = await supabase
    .from('trades')
    .select('id, post_image_path')
    .eq('id', id)
    .maybeSingle();
  if (findError)
    return Response.json({ error: findError.message }, { status: 500 });
  if (!trade)
    return Response.json({ error: 'Trade not found' }, { status: 404 });

  const formData = await request.formData();
  const outcome = formData.get('outcome');
  const rawExitPrice = formData.get('exitPrice');
  const exitPrice = cleanTradeNumber(rawExitPrice, { positive: true });
  const resultR = cleanTradeNumber(formData.get('resultR'), { limit: 100 });
  const pnl = cleanTradeNumber(formData.get('pnl'));
  const maePips = cleanTradeNumber(formData.get('maePips'), { limit: 100000 });
  const rawNotes = formData.get('notes');
  const notes =
    typeof rawNotes === 'string' ? rawNotes.trim().slice(0, 5000) : '';
  if (outcome !== 'Win' && outcome !== 'Loss' && outcome !== 'Breakeven') {
    return Response.json(
      { error: 'Choose Win, Loss, or Breakeven' },
      { status: 400 },
    );
  }
  if (
    exitPrice === null ||
    resultR === null ||
    pnl === null ||
    maePips === null ||
    maePips < 0
  ) {
    return Response.json(
      { error: 'Enter a valid exit price, RR, P&L, and MAE' },
      { status: 400 },
    );
  }
  if (
    (outcome === 'Win' && resultR <= 0) ||
    (outcome === 'Loss' && resultR >= 0) ||
    (outcome === 'Breakeven' && resultR !== 0)
  ) {
    return Response.json(
      { error: 'The selected outcome must match the RR result' },
      { status: 400 },
    );
  }

  const postImage = formData.get('postImage');
  const imageError = validateTradeImage(postImage);
  if (imageError) return Response.json({ error: imageError }, { status: 400 });

  let nextPostImagePath = trade.post_image_path as string | null;
  if (postImage instanceof File && postImage.size > 0) {
    nextPostImagePath = tradeImagePath(user.id, postImage);
    const { error: uploadError } = await supabase.storage
      .from('trade-images')
      .upload(nextPostImagePath, postImage, {
        contentType: postImage.type,
        upsert: false,
      });
    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }
  }

  const { error } = await supabase
    .from('trades')
    .update({
      outcome,
      exit_price: exitPrice,
      result_r: resultR,
      pnl,
      mae_pips: maePips,
      notes,
      post_image_path: nextPostImagePath,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) {
    if (nextPostImagePath && nextPostImagePath !== trade.post_image_path) {
      await supabase.storage.from('trade-images').remove([nextPostImagePath]);
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (trade.post_image_path && trade.post_image_path !== nextPostImagePath) {
    await supabase.storage.from('trade-images').remove([trade.post_image_path]);
  }
  return Response.json({ status: 'completed' });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const { data: trade, error: findError } = await supabase
    .from('trades')
    .select('id, image_path, post_image_path')
    .eq('id', id)
    .maybeSingle();
  if (findError)
    return Response.json({ error: findError.message }, { status: 500 });
  if (!trade)
    return Response.json({ error: 'Trade not found' }, { status: 404 });

  const { error } = await supabase.from('trades').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const imagePaths = [trade.image_path, trade.post_image_path].filter(
    (path): path is string => Boolean(path),
  );
  if (imagePaths.length) {
    await supabase.storage.from('trade-images').remove(imagePaths);
  }
  return Response.json({ status: 'deleted' });
}
