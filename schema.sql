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
  receipt_url      text,
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

-- Current balance per envelope (period-aware)
create or replace view envelope_balances as
with period_allocations as (
  select envelope_id, sum(allocated) as total_allocated
  from budget_periods
  group by envelope_id
),
tx_sums as (
  select envelope_id, sum(
    case
      when type in ('allocate', 'transfer_in') then amount
      when type in ('spend', 'transfer_out')   then -amount
      else 0
    end
  ) as net_transactions
  from transactions
  group by envelope_id
),
current_period as (
  select envelope_id, allocated as current_month_allocated
  from budget_periods
  where period_month = date_trunc('month', CURRENT_DATE)::date
)
select
  e.id as envelope_id,
  e.household_id,
  e.name,
  e.icon,
  e.color,
  coalesce(cp.current_month_allocated, e.budget_amount) as budget_amount,
  e.archived,
  coalesce(pa.total_allocated, 0) + coalesce(ts.net_transactions, 0) as balance
from envelopes e
left join period_allocations pa on pa.envelope_id = e.id
left join tx_sums ts on ts.envelope_id = e.id
left join current_period cp on cp.envelope_id = e.id;

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

-- Auto-allocate on envelope creation
create or replace function handle_new_envelope()
returns trigger language plpgsql security definer as $$
begin
  if new.budget_amount > 0 then
    insert into budget_periods (household_id, envelope_id, period_month, allocated)
    values (new.household_id, new.id, date_trunc('month', CURRENT_DATE)::date, new.budget_amount)
    on conflict (envelope_id, period_month) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_envelope_created
  after insert on envelopes
  for each row execute procedure handle_new_envelope();

-- ============================================================
-- CRON AUTOMATION (Requires pg_cron extension)
-- ============================================================
create extension if not exists pg_cron;

CREATE OR REPLACE FUNCTION cron_allocate_all_budgets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO budget_periods (
    household_id,
    envelope_id,
    period_month,
    allocated
  )
  SELECT
    household_id,
    id,
    date_trunc('month', CURRENT_DATE)::date,
    budget_amount
  FROM envelopes
  WHERE archived = false
    AND budget_amount > 0
  ON CONFLICT (envelope_id, period_month) DO NOTHING;
END;
$$;

-- Run securely on the 1st of every month at midnight
select cron.schedule(
  'monthly-budget-allocation',
  '0 0 1 * *',
  'SELECT public.cron_allocate_all_budgets();'
);

-- ============================================================
-- REALTIME CONFIGURATION
-- ============================================================
-- Enable Realtime for relevant tables
alter publication supabase_realtime add table envelopes, transactions;

-- ============================================================
-- V2 MIGRATION SCRIPT (Execute once if upgrading from V1)
-- Moves old auto-allocations to budget_periods
-- ============================================================
insert into budget_periods (household_id, envelope_id, period_month, allocated)
select household_id, envelope_id, date_trunc('month', transaction_date)::date, sum(amount)
from transactions
where type = 'allocate' and description = 'Monthly budget allocation'
group by household_id, envelope_id, date_trunc('month', transaction_date)::date
on conflict (envelope_id, period_month) do update set allocated = budget_periods.allocated + excluded.allocated;

delete from transactions 
where type = 'allocate' and description = 'Monthly budget allocation';

-- ============================================================
-- PHASE 5 STORAGE & SCHEMA UPDATE
-- ============================================================
alter table transactions add column if not exists receipt_url text;

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

create policy "receipts upload" on storage.objects for insert
  with check (bucket_id = 'receipts');

create policy "receipts select" on storage.objects for select
  using (bucket_id = 'receipts');

-- ============================================================
-- PHASE 7: RECURRING BILLS
-- ============================================================

-- Recurring bill definitions (one per bill type)
create table recurring_bills (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  name           text not null,
  icon           text not null default '🔁',
  amount         numeric(12,2) not null,
  due_day        int not null default 1,
  envelope_id    uuid references envelopes(id) on delete set null,
  auto_pay       boolean not null default false,
  notes          text,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Monthly bill instances (one per bill per month)
create table bill_instances (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references households(id) on delete cascade,
  bill_id         uuid not null references recurring_bills(id) on delete cascade,
  due_date        date not null,
  amount          numeric(12,2) not null,
  status          text not null default 'unpaid' check (status in ('unpaid', 'paid', 'skipped')),
  paid_at         timestamptz,
  transaction_id  uuid references transactions(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique(bill_id, due_date)
);

-- RLS
alter table recurring_bills enable row level security;
alter table bill_instances   enable row level security;

create policy "household bill access" on recurring_bills for all
  using (household_id = my_household_id());

create policy "household bill instance access" on bill_instances for all
  using (household_id = my_household_id());

-- pg_cron: auto-generate monthly bill instances on the 1st of each month
create or replace function generate_monthly_bills()
returns void language plpgsql security definer as $$
begin
  insert into bill_instances (household_id, bill_id, due_date, amount)
  select
    household_id,
    id,
    make_date(
      extract(year  from current_date)::int,
      extract(month from current_date)::int,
      least(due_day, 28)
    ),
    amount
  from recurring_bills
  where active = true
  on conflict (bill_id, due_date) do nothing;
end;
$$;

select cron.schedule(
  'monthly-bill-generation',
  '0 0 1 * *',
  'SELECT public.generate_monthly_bills();'
);
