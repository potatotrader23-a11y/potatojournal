import {
  backtestImagePath,
  cleanBacktestDate,
  cleanBacktestVariables,
  cleanResultR,
  parseVariables,
  validateBacktestImage,
} from '@/lib/backtests';
import { createClient, hasSupabaseEnvironment } from '@/lib/supabase/server';

async function authenticatedBacktest(id: string) {
  if (!hasSupabaseEnvironment()) return { error: 'Supabase is not configured' };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('backtests')
    .select('id, image_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'Backtest not found' };
  return { supabase, user, backtest: data };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await authenticatedBacktest(id);
  if ('error' in context) {
    const status =
      context.error === 'Unauthorized'
        ? 401
        : context.error === 'Supabase is not configured'
          ? 503
          : 404;
    return Response.json({ error: context.error }, { status });
  }

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

  let nextImagePath = context.backtest.image_path as string | null;
  if (formData.get('removeImage') === 'true') nextImagePath = null;
  if (image instanceof File && image.size > 0) {
    nextImagePath = backtestImagePath(context.user.id, image);
    const { error } = await context.supabase.storage
      .from('backtest-images')
      .upload(nextImagePath, image, {
        contentType: image.type,
        upsert: false,
      });
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  const { error } = await context.supabase
    .from('backtests')
    .update({
      variables: cleanBacktestVariables(variables),
      results: { resultR: cleanResultR(formData.get('resultR')) },
      backtest_date: backtestDate,
      image_path: nextImagePath,
    })
    .eq('id', id)
    .eq('user_id', context.user.id);

  if (error) {
    if (nextImagePath && nextImagePath !== context.backtest.image_path) {
      await context.supabase.storage
        .from('backtest-images')
        .remove([nextImagePath]);
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (
    context.backtest.image_path &&
    context.backtest.image_path !== nextImagePath
  ) {
    await context.supabase.storage
      .from('backtest-images')
      .remove([context.backtest.image_path]);
  }
  return Response.json({ id, status: 'updated' });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await authenticatedBacktest(id);
  if ('error' in context) {
    const status =
      context.error === 'Unauthorized'
        ? 401
        : context.error === 'Supabase is not configured'
          ? 503
          : 404;
    return Response.json({ error: context.error }, { status });
  }

  const { error } = await context.supabase
    .from('backtests')
    .delete()
    .eq('id', id)
    .eq('user_id', context.user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (context.backtest.image_path) {
    await context.supabase.storage
      .from('backtest-images')
      .remove([context.backtest.image_path]);
  }
  return Response.json({ id, status: 'deleted' });
}
