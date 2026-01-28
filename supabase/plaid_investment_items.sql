create extension if not exists "pgcrypto";

create table if not exists public.plaid_investment_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  access_token text not null,
  item_id text not null,
  institution_id text,
  institution_name text,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists plaid_investment_items_user_item_idx
  on public.plaid_investment_items (user_id, item_id);

create index if not exists plaid_investment_items_user_id_idx
  on public.plaid_investment_items (user_id);

alter table public.plaid_investment_items enable row level security;

create policy if not exists "Users can view own investment items" on public.plaid_investment_items
  for select using (auth.uid() = user_id);

create policy if not exists "Users can insert own investment items" on public.plaid_investment_items
  for insert with check (auth.uid() = user_id);

create policy if not exists "Users can update own investment items" on public.plaid_investment_items
  for update using (auth.uid() = user_id);
