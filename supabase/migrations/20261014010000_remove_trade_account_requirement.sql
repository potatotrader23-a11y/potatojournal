-- Trading accounts are no longer part of the journal workflow. Existing
-- account rows and historical account IDs are intentionally preserved, while
-- new trades can be saved without an account.
drop trigger if exists trades_apply_pnl_after_insert on public.trades;
drop trigger if exists trades_apply_pnl_after_update on public.trades;
drop trigger if exists trades_reverse_pnl_after_delete on public.trades;

alter table public.trades
  drop constraint if exists trades_user_id_account_id_fkey;

alter table public.trades
  alter column account_id drop not null;
