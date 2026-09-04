alter table public.trades
  add column if not exists outcome text
    check (outcome is null or outcome in ('Win', 'Loss', 'Breakeven')),
  add column if not exists post_image_path text,
  add column if not exists completed_at timestamptz;

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
  elsif tg_op = 'UPDATE' then
    target_user_id := new.user_id;
    target_account_id := new.account_id;
    balance_change := new.pnl - old.pnl;
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

drop trigger if exists trades_apply_pnl_after_update on public.trades;
create trigger trades_apply_pnl_after_update
after update of pnl on public.trades
for each row
when (old.pnl is distinct from new.pnl)
execute function public.apply_trade_pnl_to_account();
