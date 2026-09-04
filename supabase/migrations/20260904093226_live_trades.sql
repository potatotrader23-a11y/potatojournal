create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null,
  instrument text not null default 'GBPUSD' check (instrument = 'GBPUSD'),
  session text not null default 'London' check (session = 'London'),
  timeframe text not null default '15m' check (timeframe = '15m'),
  trade_date date not null,
  trade_time time without time zone not null,
  direction text not null check (direction in ('Buy', 'Sell')),
  entry_price numeric(12, 5) not null check (entry_price > 0),
  stop_loss numeric(12, 5) not null check (stop_loss > 0),
  exit_price numeric(12, 5) check (exit_price is null or exit_price > 0),
  result_r numeric(8, 2) not null check (result_r between -100 and 100),
  pnl numeric(18, 2) not null,
  notes text not null default '' check (char_length(notes) <= 5000),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, account_id)
    references public.accounts(user_id, id)
    on delete cascade
);

create index if not exists trades_user_date_idx
  on public.trades(user_id, trade_date desc, trade_time desc, created_at desc);
create index if not exists trades_account_fk_idx
  on public.trades(user_id, account_id);

alter table public.trades enable row level security;

revoke all on table public.trades from anon, authenticated;
grant select, insert, update, delete on table public.trades to authenticated;

create policy "users select own trades"
  on public.trades for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "users insert own trades"
  on public.trades for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "users update own trades"
  on public.trades for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy "users delete own trades"
  on public.trades for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trade-images',
  'trade-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload their own trade images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'trade-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can view their own trade images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'trade-images'
  and owner_id = (select auth.uid()::text)
);

create policy "Users can delete their own trade images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'trade-images'
  and owner_id = (select auth.uid()::text)
);

create or replace function public.apply_trade_pnl_to_account()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_user_id uuid;
  target_account_id text;
  balance_change numeric(18, 2);
begin
  if tg_op = 'INSERT' then
    target_user_id := new.user_id;
    target_account_id := new.account_id;
    balance_change := new.pnl;
  elsif tg_op = 'DELETE' then
    target_user_id := old.user_id;
    target_account_id := old.account_id;
    balance_change := -old.pnl;
  else
    return null;
  end if;

  update public.accounts
  set
    balance = balance + balance_change,
    pnl = (balance + balance_change) - starting_balance,
    equity = coalesce(equity, '[]'::jsonb) || jsonb_build_array(
      case
        when starting_balance = 0 then 100
        else round(((balance + balance_change) / starting_balance) * 100, 4)
      end
    ),
    updated_at = now()
  where user_id = target_user_id and id = target_account_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trades_apply_pnl_after_insert on public.trades;
create trigger trades_apply_pnl_after_insert
after insert on public.trades
for each row execute function public.apply_trade_pnl_to_account();

drop trigger if exists trades_reverse_pnl_after_delete on public.trades;
create trigger trades_reverse_pnl_after_delete
after delete on public.trades
for each row execute function public.apply_trade_pnl_to_account();
