create table if not exists public.accounts (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  account_type text not null check (account_type in ('Personal', 'Forex', 'Prop firm')),
  platform text not null default '',
  currency text not null default 'USD',
  balance numeric(18, 2) not null default 0,
  starting_balance numeric(18, 2) not null default 0,
  risk_percent numeric(7, 3) not null default 1,
  daily_loss_percent numeric(7, 3) not null default 3,
  max_loss_percent numeric(7, 3) not null default 8,
  pnl numeric(18, 2) not null default 0,
  equity jsonb not null default '[100, 100]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.backtests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null,
  instrument text not null,
  assumptions jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (user_id, account_id)
    references public.accounts(user_id, id)
    on delete cascade
);

create index if not exists accounts_user_updated_idx
  on public.accounts(user_id, updated_at desc);
create index if not exists backtests_user_created_idx
  on public.backtests(user_id, created_at desc);
create index if not exists backtests_account_fk_idx
  on public.backtests(user_id, account_id);

alter table public.accounts enable row level security;
alter table public.backtests enable row level security;

grant usage on schema public to authenticated;
revoke all on table public.accounts from anon, authenticated;
revoke all on table public.backtests from anon, authenticated;
grant select, insert, update, delete on table public.accounts to authenticated;
grant select, insert, update, delete on table public.backtests to authenticated;

create policy "users select own accounts"
  on public.accounts for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "users insert own accounts"
  on public.accounts for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "users update own accounts"
  on public.accounts for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "users delete own accounts"
  on public.accounts for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "users select own backtests"
  on public.backtests for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "users insert own backtests"
  on public.backtests for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "users update own backtests"
  on public.backtests for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "users delete own backtests"
  on public.backtests for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
