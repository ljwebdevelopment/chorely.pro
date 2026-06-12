-- Approved volunteer testers for TEST_MODE. Each row is claimed once by a
-- real Supabase Auth account created through the volunteer-verify/claim flow.
create table if not exists public.volunteer_testers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  normalized_phone text not null,
  claimed_at timestamptz,
  auth_user_id uuid references auth.users(id) on delete set null,
  founding_tester boolean not null default true,
  premium_override boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists volunteer_testers_email_key on public.volunteer_testers (lower(email));
create unique index if not exists volunteer_testers_normalized_phone_key on public.volunteer_testers (normalized_phone);

alter table public.volunteer_testers enable row level security;

create policy "volunteer testers read own row" on public.volunteer_testers
  for select using (auth.uid() = auth_user_id);

insert into public.volunteer_testers (name, email, phone, normalized_phone) values
  ('Ben Bantista', 'benjamin.m.bantista@gmail.com', '918-822-4311', '9188224311'),
  ('Lindsey Dreadfulwater', 'linspan88@gmail.com', '918-316-7317', '9183167317'),
  ('Leslie Silvers', 'lesliesilvers25@outlook.com', '214-527-6328', '2145276328'),
  ('Misty Boston', 'bostonm1529@gmail.com', '918-822-5115', '9188225115'),
  ('Rhiannon Winsett', 'rhiannonwinsett@icloud.com', '918-457-0697', '9184570697'),
  ('Brittany Davis', 'brittanydavis1993@icloud.com', '918-506-1954', '9185061954'),
  ('Emily Langston', 'emason53@live.com', '918-351-4918', '9183514918'),
  ('Christi Muck', 'christimuck103@gmail.com', '918-772-0048', '9187720048'),
  ('Jill Weeks', 'jill.weeks@hotmail.com', '918-889-8155', '9188898155'),
  ('Courtney Casey', 'courtney918faye@gmail.com', '918-316-6618', '9183166618'),
  ('Sarah Franke', 'smfranke4833@gmail.com', '918-718-4833', '9187184833')
on conflict (lower(email)) do nothing;
