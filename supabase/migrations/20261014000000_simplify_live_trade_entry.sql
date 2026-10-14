alter table public.trades
  alter column entry_price drop not null,
  alter column stop_loss drop not null;

comment on column public.trades.entry_price is
  'Legacy optional entry price. New live trades are opened without price details.';

comment on column public.trades.stop_loss is
  'Legacy optional stop loss. New live trades are opened without price details.';

drop trigger if exists trades_apply_pnl_after_insert on public.trades;
