-- Optional parent PIN protecting the parent profile on the
-- "Who's Using Chorely?" screen. Stored hashed, same scheme as child PINs.
alter table public.profiles
  add column if not exists parent_pin_hash text;
