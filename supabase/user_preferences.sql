create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  currency text default 'USD',
  tax_year_start_month int default 1,
  notifications_enabled boolean default true,
  face_id_enabled boolean default false,
  updated_at timestamp with time zone default now()
);

alter table public.user_preferences enable row level security;

create policy if not exists "Users can view own preferences" on public.user_preferences
  for select using (auth.uid() = user_id);

create policy if not exists "Users can insert own preferences" on public.user_preferences
  for insert with check (auth.uid() = user_id);

create policy if not exists "Users can update own preferences" on public.user_preferences
  for update using (auth.uid() = user_id);
