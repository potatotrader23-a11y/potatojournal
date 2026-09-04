import { createClient, hasSupabaseEnvironment } from '@/lib/supabase/server';

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
    .select('id, image_path')
    .eq('id', id)
    .maybeSingle();
  if (findError)
    return Response.json({ error: findError.message }, { status: 500 });
  if (!trade)
    return Response.json({ error: 'Trade not found' }, { status: 404 });

  const { error } = await supabase.from('trades').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (trade.image_path) {
    await supabase.storage.from('trade-images').remove([trade.image_path]);
  }
  return Response.json({ status: 'deleted' });
}
