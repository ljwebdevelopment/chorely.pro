-- ============================================================
-- CHORELY — Supabase Setup SQL
-- Run this entire file once in: Supabase Dashboard → SQL Editor
-- It is safe to run again (all statements use IF NOT EXISTS /
-- OR REPLACE / DROP IF EXISTS patterns).
-- ============================================================

-- ── 1. Schema usage ──────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ── 2. Table-level grants (fixes the 403 permission errors) ──
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- ── 3. Sequence grants (needed for uuid / serial PKs) ─────────
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ── 4. Enable Row Level Security on every table ───────────────
ALTER TABLE IF EXISTS public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.households            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.household_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.children              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.child_pins            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chores                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chore_assignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chore_completions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.approval_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chore_comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.earnings_ledger       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.onboarding_state      ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS Policies ──────────────────────────────────────────
-- Drop and recreate all policies so re-runs are safe.

-- profiles
DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- households
DROP POLICY IF EXISTS "Owner manages household" ON public.households;
CREATE POLICY "Owner manages household" ON public.households
  FOR ALL USING (auth.uid() = owner_id);

-- household_members
DROP POLICY IF EXISTS "Members see own membership" ON public.household_members;
CREATE POLICY "Members see own membership" ON public.household_members
  FOR ALL USING (auth.uid() = user_id);

-- children
DROP POLICY IF EXISTS "Household owner manages children" ON public.children;
CREATE POLICY "Household owner manages children" ON public.children
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = household_id AND h.owner_id = auth.uid()
    )
  );

-- child_pins
DROP POLICY IF EXISTS "Household owner manages PINs" ON public.child_pins;
CREATE POLICY "Household owner manages PINs" ON public.child_pins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.households h ON h.id = c.household_id
      WHERE c.id = child_id AND h.owner_id = auth.uid()
    )
  );

-- chores
DROP POLICY IF EXISTS "Household owner manages chores" ON public.chores;
CREATE POLICY "Household owner manages chores" ON public.chores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = household_id AND h.owner_id = auth.uid()
    )
  );

-- chore_assignments
DROP POLICY IF EXISTS "Household owner manages assignments" ON public.chore_assignments;
CREATE POLICY "Household owner manages assignments" ON public.chore_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chores c
      JOIN public.households h ON h.id = c.household_id
      WHERE c.id = chore_id AND h.owner_id = auth.uid()
    )
  );

-- chore_completions
DROP POLICY IF EXISTS "Household owner manages completions" ON public.chore_completions;
CREATE POLICY "Household owner manages completions" ON public.chore_completions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = household_id AND h.owner_id = auth.uid()
    )
  );

-- approval_events
DROP POLICY IF EXISTS "Household owner sees approval events" ON public.approval_events;
CREATE POLICY "Household owner sees approval events" ON public.approval_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chore_completions cc
      JOIN public.households h ON h.id = cc.household_id
      WHERE cc.id = completion_id AND h.owner_id = auth.uid()
    )
  );

-- chore_comments
DROP POLICY IF EXISTS "Household owner manages comments" ON public.chore_comments;
CREATE POLICY "Household owner manages comments" ON public.chore_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = household_id AND h.owner_id = auth.uid()
    )
  );

-- earnings_ledger
DROP POLICY IF EXISTS "Household owner manages earnings" ON public.earnings_ledger;
CREATE POLICY "Household owner manages earnings" ON public.earnings_ledger
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.households h
      WHERE h.id = household_id AND h.owner_id = auth.uid()
    )
  );

-- notifications
DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- subscriptions — users can only READ their own row; webhooks write via service_role
DROP POLICY IF EXISTS "Users see own subscription" ON public.subscriptions;
CREATE POLICY "Users see own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- onboarding_state
DROP POLICY IF EXISTS "Users manage own onboarding" ON public.onboarding_state;
CREATE POLICY "Users manage own onboarding" ON public.onboarding_state
  FOR ALL USING (auth.uid() = user_id);

-- ── 6. Auto-create profile on new user signup ─────────────────
-- Creates a profiles row automatically when someone signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Done. ─────────────────────────────────────────────────────
-- After running this, all tables are accessible to the app.
-- Test by signing up at /sign-up — a profiles row should appear
-- in the profiles table immediately after email confirmation.
