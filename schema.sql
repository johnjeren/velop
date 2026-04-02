-- ============================================================
-- Envelope Budget App — Supabase Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- HOUSEHOLDS
-- A household links multiple users (you + wife) to shared data
-- ============================================================
create table households (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null default 'Our Budget',
  created_at  timestamptz not null default now()
);

-- ============================================================
-- PROFILES
-- Extends Supabase auth.users with household membership
-- ============================================================
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  household_id  uuid references households(id) on delete set null,
  display_name  text not null,
  avatar_color  text not null default '#6366f1',
  created_at    timestamptz not null default now()
);

-- ============================================================
-- HOUSEHOLD INVITES
-- Invite link system so wife can join your household
-- ============================================================
create table household_invites (
  id            uuid primary key default uuid_generate_v4(),
  household_id  uuid not null references households(id) on delete cascade,
  invited_by    uuid not null references profiles(id) on delete cascade,
  token         text not null unique default encode(gen_random_bytes(16), 'hex'),
  used_at       timestamptz,
  expires_at    timestamptz not null default (now() + interval '7 days'),
  created_at    timestamptz not null default now()
);

-- ============================================================
-- ENVELOPES
-- Each envelope represents a spending category
-- ============================================================
create table envelopes (
  id            uuid primary key default uuid_generate_v4(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,
  icon          text not null default '💰',
  color         text not null default '#6366f1',
  budget_amount numeric(12, 2) not null default 0,   -- monthly allocation
  sort_order    int not null default 0,
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- TRANSACTIONS
-- Every spend, income allocation, or transfer is a transaction
-- type: 'spend' | 'allocate' | 'transfer_out' | 'transfer_in'
-- ============================================================
create table transactions (
  id              uuid primary key default uuid_generate_v4(),
  household_id    uuid not null references households(id) on delete cascade,
  envelope_id     uuid references envelopes(id) on delete set null,
  created_by      uuid not null references profiles(id) on delete cascade,
  type            text not null check (type in ('spend', 'allocate', 'transfer_out', 'transfer_in')),
  amount          numeric(12, 2) not null,             -- always positive
  description     text not null default '',
  merchant        text,
  transfer_pair_id uuid,                               -- links transfer_out ↔ transfer_in rows
  transaction_date date not null default current_date,
  created_at      timestamptz not null default now()
);

-- Index for fast envelope balance queries
create index idx_transactions_envelope on transactions(envelope_id);
create index idx_transactions_household on transactions(household_id);
create index idx_transactions_date on transactions(transaction_date desc);

-- ============================================================
-- BUDGET PERIODS
-- Track monthly budget allocations per envelope
-- ============================================================
create table budget_periods (
  id            uuid primary key default uuid_generate_v4(),
  household_id  uuid not null references households(id) on delete cascade,
  envelope_id   uuid not null references envelopes(id) on delete cascade,
  period_month  date not null,   -- store as first day of month: 2024-01-01
  allocated     numeric(12, 2) not null default 0,
  created_at    timestamptz not null default now(),
  unique(envelope_id, period_month)
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Current balance per envelope (all-time)
create or replace view envelope_balances as
select
  e.id as envelope_id,
  e.household_id,
  e.name,
  e.icon,
  e.color,
  e.budget_amount,
  e.archived,
  coalesce(sum(
    case
      when t.type in ('allocate', 'transfer_in') then t.amount
      when t.type in ('spend', 'transfer_out')   then -t.amount
      else 0
    end
  ), 0) as balance
from envelopes e
left join transactions t on t.envelope_id = e.id
group by e.id;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table households        enable row level security;
alter table profiles          enable row level security;
alter table household_invites enable row level security;
alter table envelopes         enable row level security;
alter table transactions      enable row level security;
alter table budget_periods    enable row level security;

-- Helper function: get current user's household_id
create or replace function my_household_id()
returns uuid language sql security definer stable as $$
  select household_id from profiles where id = auth.uid()
$$;

-- Households: members can read/update their own
create policy "household members can read"   on households for select using (id = my_household_id());
create policy "household members can update" on households for update using (id = my_household_id());
create policy "anyone can insert household"  on households for insert with check (true);

-- Profiles: users manage their own, can read household members
create policy "own profile full access" on profiles for all using (id = auth.uid());
create policy "read household members" on profiles for select using (household_id = my_household_id());

-- Invites: household members can create/read
create policy "members can manage invites" on household_invites for all
  using (household_id = my_household_id());

-- Envelopes: scoped to household
create policy "household envelope access" on envelopes for all
  using (household_id = my_household_id());

-- Transactions: scoped to household
create policy "household transaction access" on transactions for all
  using (household_id = my_household_id());

-- Budget periods: scoped to household
create policy "household budget period access" on budget_periods for all
  using (household_id = my_household_id());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on sign-up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Update envelope updated_at
create or replace function touch_envelope()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger envelope_updated
  before update on envelopes
  for each row execute procedure touch_envelope();
