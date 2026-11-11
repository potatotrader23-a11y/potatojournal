alter table public.backtests
  drop constraint if exists backtests_confluence_direction_check;

alter table public.backtests
  drop column if exists confluence_direction;
