-- Web Push: per-device subscriptions + a send log used for daily dedup.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on push_subscriptions(user_id);
create index if not exists push_subscriptions_household_idx on push_subscriptions(household_id);

alter table push_subscriptions enable row level security;

-- A user manages only their own device subscriptions. The cron sender uses the
-- service role, which bypasses RLS to read across all households.
create policy "push_subscriptions own select" on push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push_subscriptions own insert" on push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push_subscriptions own delete" on push_subscriptions
  for delete using (auth.uid() = user_id);

-- One row per (user, alert, day) so the daily cron never sends the same alert twice.
create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_key text not null,
  sent_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, alert_key, sent_on)
);

create index if not exists notification_log_user_idx on notification_log(user_id, sent_on);

-- Written/read only by the service role (cron). RLS on with no client policies
-- means anon/auth clients are denied by default.
alter table notification_log enable row level security;
