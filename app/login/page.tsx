import { redirect } from 'next/navigation';
import { createClient, hasSupabaseEnvironment } from '@/lib/supabase/server';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; setup?: string }>;
}) {
  const query = await searchParams;
  const configured = hasSupabaseEnvironment();

  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect('/');
  }

  return (
    <LoginForm
      configured={configured}
      initialError={query.error}
      setupPending={query.setup === '1'}
    />
  );
}
