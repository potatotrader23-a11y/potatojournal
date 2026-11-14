alter table public.trades
  drop constraint if exists trades_timeframe_check;

alter table public.trades
  alter column timeframe set default '15m';

alter table public.trades
  add constraint trades_timeframe_check
  check (timeframe in ('5m', '15m'));

create index if not exists trades_user_timeframe_date_idx
  on public.trades(user_id, timeframe, trade_date desc, trade_time desc);
