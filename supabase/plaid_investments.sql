create extension if not exists "pgcrypto";

create table if not exists public.plaid_investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plaid_item_id uuid,
  account_id text,
  account_name text,
  account_type text,
  account_subtype text,
  institution_name text,
  security_id text,
  security_name text,
  symbol text,
  quantity numeric,
  price numeric,
  value numeric,
  cost_basis numeric,
  iso_currency_code text,
  unofficial_currency_code text,
  last_updated_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists plaid_investments_user_id_idx on public.plaid_investments (user_id);
create index if not exists plaid_investments_account_id_idx on public.plaid_investments (account_id);
create index if not exists plaid_investments_symbol_idx on public.plaid_investments (symbol);
create unique index if not exists plaid_investments_user_account_security_idx
  on public.plaid_investments (user_id, account_id, security_id);

alter table public.plaid_investments enable row level security;

create policy if not exists "Users can view own investments" on public.plaid_investments
  for select using (auth.uid() = user_id);

create policy if not exists "Users can insert own investments" on public.plaid_investments
  for insert with check (auth.uid() = user_id);

create policy if not exists "Users can update own investments" on public.plaid_investments
  for update using (auth.uid() = user_id);
