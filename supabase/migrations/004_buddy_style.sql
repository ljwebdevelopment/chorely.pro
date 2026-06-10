-- Sprout customization: families can pick the chore buddy's pot color,
-- bloom color, and face. Stored per household; normalized in app code.
alter table public.households
  add column if not exists buddy_style jsonb not null default '{}'::jsonb;
