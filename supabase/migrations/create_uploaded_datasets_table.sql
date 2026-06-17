create extension if not exists "pgcrypto";

create table if not exists public.uploaded_datasets (
  id uuid primary key default gen_random_uuid(),
  file_name text,
  brand text,
  row_count int,
  file_type text,
  uploaded_at timestamp without time zone default now(),
  preview_data jsonb,
  user_email text
);

alter table public.uploaded_datasets enable row level security;

drop policy if exists "Uploaded datasets are readable" on public.uploaded_datasets;
drop policy if exists "Uploaded datasets are insertable" on public.uploaded_datasets;
drop policy if exists "Uploaded datasets are deletable" on public.uploaded_datasets;

create policy "Uploaded datasets are readable" on public.uploaded_datasets
  for select using (true);

create policy "Uploaded datasets are insertable" on public.uploaded_datasets
  for insert with check (true);

create policy "Uploaded datasets are deletable" on public.uploaded_datasets
  for delete using (true);

create index if not exists uploaded_datasets_email_uploaded_idx
  on public.uploaded_datasets(user_email, uploaded_at desc);
