alter table public.trades
  add column if not exists lot_size numeric(10, 2)
    check (lot_size is null or (lot_size > 0 and lot_size <= 100000)),
  add column if not exists mae_pips numeric(10, 2)
    check (mae_pips is null or (mae_pips >= 0 and mae_pips <= 100000));
