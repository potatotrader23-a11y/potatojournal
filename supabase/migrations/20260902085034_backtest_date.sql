alter table public.backtests
add column if not exists backtest_date date;

update public.backtests
set backtest_date = (created_at at time zone 'Asia/Manila')::date
where backtest_date is null;

alter table public.backtests
alter column backtest_date set default current_date,
alter column backtest_date set not null;

create index if not exists backtests_user_date_idx
on public.backtests(user_id, backtest_date desc, created_at desc);
