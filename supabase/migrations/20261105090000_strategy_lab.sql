create table if not exists public.strategy_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strategy text not null check (strategy in ('5m', '15m')),
  test_date date not null,
  result_r numeric(4, 1) not null,
  created_at timestamptz not null default now(),
  constraint strategy_tests_fixed_result check (
    (strategy = '5m' and result_r in (-1, 2))
    or (strategy = '15m' and result_r in (-1, 3))
  )
);

create index if not exists strategy_tests_user_date_idx
  on public.strategy_tests(user_id, test_date desc, created_at desc);

alter table public.strategy_tests enable row level security;

revoke all on table public.strategy_tests from anon, authenticated;
grant select, insert, delete on table public.strategy_tests to authenticated;

create policy "users select own strategy tests"
  on public.strategy_tests for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "users insert own strategy tests"
  on public.strategy_tests for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "users delete own strategy tests"
  on public.strategy_tests for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
