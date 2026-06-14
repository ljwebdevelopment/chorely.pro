-- In-app bug reports for TEST_MODE volunteer testers. Users can insert and
-- read only their own reports; the admin dashboard reads all reports via the
-- service-role client, which bypasses RLS.
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  volunteer_tester_id uuid references public.volunteer_testers(id) on delete set null,
  name text,
  email text,
  page_path text,
  device_type text,
  what_happened text not null,
  what_trying_to_do text,
  user_agent text,
  test_mode boolean not null default true,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.bug_reports enable row level security;

create policy "bug reports insert own" on public.bug_reports
  for insert with check (auth.uid() = user_id);

create policy "bug reports read own" on public.bug_reports
  for select using (auth.uid() = user_id);
