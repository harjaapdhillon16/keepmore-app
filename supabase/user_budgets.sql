create table if not exists public.user_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month_start date not null,
  amount numeric not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists user_budgets_user_month_idx
  on public.user_budgets (user_id, month_start);

create index if not exists user_budgets_user_id_idx
  on public.user_budgets (user_id);

alter table public.user_budgets enable row level security;

create policy if not exists "Users can view own budgets" on public.user_budgets
  for select using (auth.uid() = user_id);

create policy if not exists "Users can insert own budgets" on public.user_budgets
  for insert with check (auth.uid() = user_id);

create policy if not exists "Users can update own budgets" on public.user_budgets
  for update using (auth.uid() = user_id);
