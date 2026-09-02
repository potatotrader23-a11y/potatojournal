import { redirect } from 'next/navigation';
import { createClient, hasSupabaseEnvironment } from '@/lib/supabase/server';
import TradingDashboard from './trading-dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  if (!hasSupabaseEnvironment()) redirect('/login?setup=1');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <TradingDashboard userEmail={user.email ?? 'Trader'} />;
}
