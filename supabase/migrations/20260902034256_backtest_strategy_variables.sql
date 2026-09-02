alter table public.backtests
  add column if not exists variables jsonb not null default '{}'::jsonb;

create index if not exists backtests_variables_gin_idx
  on public.backtests using gin (variables jsonb_path_ops);
