-- CHORELY PRODUCTION SCHEMA RESET
-- The live database was created from an older draft schema (e.g. profiles
-- had no email column, subscriptions used a different key shape), so the
-- app could not read or write it. This script rebuilds the schema from the
-- repository migrations. Safe to run: the app has never successfully
-- written data to this database. Auth accounts (auth.users) are NOT touched.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.approval_events cascade;
drop table if exists public.earnings_ledger cascade;
drop table if exists public.chore_completions cascade;
drop table if exists public.chore_comments cascade;
drop table if exists public.chore_assignments cascade;
drop table if exists public.chores cascade;
drop table if exists public.child_pins cascade;
drop table if exists public.children cascade;
drop table if exists public.household_members cascade;
drop table if exists public.households cascade;
drop table if exists public.notifications cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.onboarding_state cascade;
drop table if exists public.profiles cascade;

-- ============ 001_initial_schema.sql ============
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists households_one_per_owner
on public.households (owner_id);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'parent' check (role in ('parent')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  avatar_url text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.child_pins (
  child_id uuid primary key references public.children(id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text,
  reward_cents integer not null default 0 check (reward_cents >= 0),
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly', 'monthly', 'custom')),
  custom_schedule text,
  shared_completion_mode text not null default 'any' check (shared_completion_mode in ('any', 'all')),
  split_payment_enabled boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chore_assignments (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (chore_id, child_id)
);

create table if not exists public.chore_comments (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  kind text not null default 'household_note' check (kind in ('household_note', 'supply_note', 'chore_issue')),
  alert_label text,
  note text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chore_completions (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  completed_by_child_id uuid references public.children(id) on delete set null,
  completed_together boolean not null default false,
  participant_child_ids uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('collecting', 'pending', 'approved', 'rejected', 'redo_requested')),
  note text,
  due_on date not null default current_date,
  completed_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create unique index if not exists chore_completions_one_payable_per_due_day
on public.chore_completions (chore_id, due_on)
where status in ('collecting', 'pending', 'approved');

create table if not exists public.approval_events (
  id uuid primary key default gen_random_uuid(),
  completion_id uuid not null references public.chore_completions(id) on delete cascade,
  action text not null check (action in ('approved', 'rejected', 'redo_requested')),
  note text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.earnings_ledger (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  chore_id uuid references public.chores(id) on delete set null,
  completion_id uuid references public.chore_completions(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'approved' check (status in ('pending', 'approved', 'void')),
  memo text,
  created_at timestamptz not null default now()
);

create unique index if not exists earnings_ledger_completion_child_unique
on public.earnings_ledger (completion_id, child_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'none',
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.onboarding_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_created boolean not null default false,
  children_added boolean not null default false,
  rewards_set boolean not null default false,
  first_chore_created boolean not null default false,
  example_approved boolean not null default false,
  earnings_reviewed boolean not null default false,
  pwa_reviewed boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.children enable row level security;
alter table public.child_pins enable row level security;
alter table public.chores enable row level security;
alter table public.chore_assignments enable row level security;
alter table public.chore_comments enable row level security;
alter table public.chore_completions enable row level security;
alter table public.approval_events enable row level security;
alter table public.earnings_ledger enable row level security;
alter table public.notifications enable row level security;
alter table public.subscriptions enable row level security;
alter table public.onboarding_state enable row level security;

create policy "profiles own rows" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "subscriptions own rows" on public.subscriptions for select using (auth.uid() = user_id);
create policy "onboarding own rows" on public.onboarding_state for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "households owned by user" on public.households for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "household members owned household" on public.household_members for all using (
  exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
) with check (
  exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
);
create policy "children household owner" on public.children for all using (
  exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
) with check (
  exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
);
create policy "child pins household owner" on public.child_pins for all using (
  exists (
    select 1 from public.children c
    join public.households h on h.id = c.household_id
    where c.id = child_id and h.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.children c
    join public.households h on h.id = c.household_id
    where c.id = child_id and h.owner_id = auth.uid()
  )
);
create policy "chores household owner" on public.chores for all using (
  exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
) with check (
  exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
);
create policy "assignments household owner" on public.chore_assignments for all using (
  exists (
    select 1 from public.chores ch
    join public.households h on h.id = ch.household_id
    where ch.id = chore_id and h.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.chores ch
    join public.households h on h.id = ch.household_id
    where ch.id = chore_id and h.owner_id = auth.uid()
  )
);
create policy "chore comments household owner" on public.chore_comments for all using (
  exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
) with check (
  exists (
    select 1 from public.chores ch
    join public.households h on h.id = ch.household_id
    where ch.id = chore_id and h.id = household_id and h.owner_id = auth.uid()
  )
);
create policy "completions household owner" on public.chore_completions for all using (
  exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
) with check (
  exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
);
create policy "approval events household owner" on public.approval_events for all using (
  exists (
    select 1 from public.chore_completions cc
    join public.households h on h.id = cc.household_id
    where cc.id = completion_id and h.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.chore_completions cc
    join public.households h on h.id = cc.household_id
    where cc.id = completion_id and h.owner_id = auth.uid()
  )
);
create policy "ledger household owner" on public.earnings_ledger for all using (
  exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
) with check (
  exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
);
create policy "notifications own rows" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  insert into public.subscriptions (user_id, status)
  values (new.id, 'none')
  on conflict (user_id) do nothing;
  insert into public.onboarding_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ============ 002_allow_payout_entries.sql ============
-- Allow negative amount_cents so payout entries can be recorded as negative values.
-- Payouts are inserted into earnings_ledger with a negative amount_cents, which
-- automatically reduces the running balance for that child.
alter table public.earnings_ledger
  drop constraint if exists earnings_ledger_amount_cents_check;

-- ============ Role grants (003) ============
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
grant all privileges on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- ============ Backfill rows for accounts created before this reset ============
insert into public.profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data->>'full_name', '')
from auth.users
on conflict (id) do nothing;

insert into public.subscriptions (user_id, status)
select id, 'none' from auth.users
on conflict (user_id) do nothing;

insert into public.onboarding_state (user_id)
select id from auth.users
on conflict (user_id) do nothing;