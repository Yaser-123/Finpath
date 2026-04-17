-- ================================================================
-- FinPath v1 — Initial Schema Migration
-- Run this in the Supabase SQL Editor for your finpath-prod project
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. profiles
-- ────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id                    uuid references auth.users on delete cascade primary key,
  full_name             text,
  email                 text,
  monthly_income        numeric default 0,
  occupation            text check (occupation in ('salaried', 'student')),
  wealth_ring_fence_pct numeric default 20,
  coins                 integer default 0,
  tier                  text default 'bronze' check (tier in ('bronze','silver','gold','platinum','diamond')),
  created_at            timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles: owner access"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on sign-up via trigger
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ────────────────────────────────────────────────────────────────
-- 2. transactions
-- ────────────────────────────────────────────────────────────────
create table if not exists transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references profiles(id) on delete cascade not null,
  source           text not null check (source in ('sms', 'manual')),
  type             text not null check (type in ('credit', 'debit')),
  amount           numeric not null,
  merchant_name    text,
  category         text,
  raw_sms          text,
  transaction_date timestamptz,
  created_at       timestamptz default now()
);

create index idx_transactions_user_id on transactions(user_id);
create index idx_transactions_date    on transactions(transaction_date desc);

alter table transactions enable row level security;

create policy "transactions: owner access"
  on transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- 3. goals
-- ────────────────────────────────────────────────────────────────
create table if not exists goals (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references profiles(id) on delete cascade not null,
  title                     text not null,
  target_amount             numeric not null,
  current_amount            numeric default 0,
  timeframe_months          integer not null,
  type                      text check (type in ('short','medium','long')),
  is_feasible               boolean,
  feasibility_note          text,
  suggested_timeframe_months integer,
  status                    text default 'active' check (status in ('active','completed','abandoned')),
  steps                     jsonb,
  created_at                timestamptz default now()
);

create index idx_goals_user_id on goals(user_id);

alter table goals enable row level security;

create policy "goals: owner access"
  on goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- 4. wealth_allocations
-- ────────────────────────────────────────────────────────────────
create table if not exists wealth_allocations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references profiles(id) on delete cascade not null,
  month             text not null,           -- format: '2025-01'
  total_income      numeric,
  ring_fenced_amount numeric,
  static_saving     numeric,
  dynamic_saving    numeric,
  notes             text,
  created_at        timestamptz default now(),
  unique (user_id, month)
);

alter table wealth_allocations enable row level security;

create policy "wealth_allocations: owner access"
  on wealth_allocations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- 5. investments
-- ────────────────────────────────────────────────────────────────
create table if not exists investments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references profiles(id) on delete cascade not null,
  ticker            text,
  asset_type        text check (asset_type in ('stock','crypto','gold','commodity')),
  suggested         boolean default true,
  analysis_summary  text,
  news_sentiment    text check (news_sentiment in ('positive','neutral','negative')),
  technical_signal  text check (technical_signal in ('buy','hold','sell')),
  created_at        timestamptz default now()
);

alter table investments enable row level security;

create policy "investments: owner access"
  on investments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- 6. quiz_attempts
-- ────────────────────────────────────────────────────────────────
create table if not exists quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  question_id text not null,
  is_correct  boolean not null,
  coins_earned integer default 0,
  created_at  timestamptz default now()
);

alter table quiz_attempts enable row level security;

create policy "quiz_attempts: owner access"
  on quiz_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
