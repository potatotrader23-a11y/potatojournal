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
  const { error, count } = await supabase
    .from('strategy_tests')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!count)
    return Response.json({ error: 'Test not found' }, { status: 404 });
  return Response.json({ id, status: 'deleted' });
}
