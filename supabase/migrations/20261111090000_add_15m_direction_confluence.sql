alter table public.backtests
  add column if not exists confluence_direction text;

alter table public.backtests
  drop constraint if exists backtests_confluence_direction_check;

alter table public.backtests
  add constraint backtests_confluence_direction_check
  check (
    confluence_direction is null
    or confluence_direction in ('Uptrend', 'Downtrend')
  );
