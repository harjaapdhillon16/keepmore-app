create extension if not exists "pgcrypto";

create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid,
  event_type text not null,
  event_name text,
  screen_name text,
  metadata jsonb,
  platform text,
  app_version text,
  app_build text,
  created_at timestamp with time zone default now()
);

create index if not exists user_activity_user_id_idx
  on public.user_activity (user_id);

create index if not exists user_activity_created_at_idx
  on public.user_activity (created_at desc);

create index if not exists user_activity_event_type_idx
  on public.user_activity (event_type);

create index if not exists user_activity_session_id_idx
  on public.user_activity (session_id);

alter table public.user_activity enable row level security;

create policy if not exists "Users can insert own activity" on public.user_activity
  for insert with check (auth.uid() = user_id);

create policy if not exists "Users can view own activity" on public.user_activity
  for select using (auth.uid() = user_id);
