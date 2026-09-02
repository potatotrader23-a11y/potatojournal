alter table public.backtests
add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'backtest-images',
  'backtest-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload their own backtest images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'backtest-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can view their own backtest images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'backtest-images'
  and owner_id = (select auth.uid()::text)
);

create policy "Users can delete their own backtest images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'backtest-images'
  and owner_id = (select auth.uid()::text)
);
