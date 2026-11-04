drop table if exists public.strategy_tests;

alter table public.backtests
  add column if not exists timeframe text not null default '5m';

alter table public.backtests
  drop constraint if exists backtests_timeframe_check;

alter table public.backtests
  add constraint backtests_timeframe_check
  check (timeframe in ('5m', '15m'));

create index if not exists backtests_user_timeframe_date_idx
  on public.backtests(user_id, timeframe, backtest_date desc, created_at desc);
