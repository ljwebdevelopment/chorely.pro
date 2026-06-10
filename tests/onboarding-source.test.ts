import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("onboarding source safeguards", () => {
  it("uses idempotent onboarding progress writes so repaired accounts can continue setup", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.match(actions, /async function upsertOnboardingProgress\(/);
    assert.match(actions, /\.from\("onboarding_state"\)[\s\S]*?\.upsert\(\{ user_id: userId, \.\.\.progress, updated_at: new Date\(\)\.toISOString\(\) \}, \{ onConflict: "user_id" \}\)/);
    assert.match(actions, /upsertOnboardingProgress\(supabase, context\.user\.id, \{ household_created: true \}\)/);
    assert.match(actions, /upsertOnboardingProgress\(supabase, context\.user\.id, \{[\s\S]*?children_added: true,[\s\S]*?rewards_set: true[\s\S]*?\}\)/);
    assert.match(actions, /upsertOnboardingProgress\(supabase, context\.user\.id, \{[\s\S]*?first_chore_created: true[\s\S]*?\}\)/);
    assert.match(actions, /upsertOnboardingProgress\(supabase, context\.user\.id, \{[\s\S]*?example_approved: true,[\s\S]*?earnings_reviewed: true[\s\S]*?\}\)/);
  });

  it("verifies current active setup data before final onboarding completion", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.match(
      actions,
      /from\("onboarding_state"\)[\s\S]*?\.select\("household_created,children_added,rewards_set,first_chore_created,example_approved,earnings_reviewed,pwa_reviewed"\)[\s\S]*?\.eq\("user_id", context\.user\.id\)[\s\S]*?\.maybeSingle\(\)/
    );
    assert.match(actions, /missingOnboardingData\(\{/);
    assert.match(actions, /\.from\("children"\)[\s\S]*?\.select\("id", \{ count: "exact", head: true \}\)[\s\S]*?\.is\("archived_at", null\)/);
    assert.match(actions, /\.from\("chores"\)[\s\S]*?\.select\("id", \{ count: "exact", head: true \}\)[\s\S]*?\.eq\("active", true\)/);
    assert.match(
      actions,
      /\.from\("chore_completions"\)[\s\S]*?\.select\("id", \{ count: "exact", head: true \}\)[\s\S]*?\.eq\("status", "approved"\)[\s\S]*?\.eq\("note", "Onboarding example completion"\)/
    );
    assert.match(actions, /const verifiedState = \{/);
    assert.match(actions, /household_created: Boolean\(state\?\.household_created \|\| context\.household\)/);
    assert.match(actions, /children_added: Boolean\(state\?\.children_added \|\| activeChildrenCount\)/);
    assert.match(actions, /first_chore_created: Boolean\(state\?\.first_chore_created \|\| activeChoresCount\)/);
    assert.match(actions, /example_approved: Boolean\(state\?\.example_approved \|\| approvedExampleCount\)/);
    assert.match(actions, /upsertOnboardingProgress\(supabase, context\.user\.id, verifiedState\)/);
  });

  it("uses dependency-aware setup guidance without weakening the final completion gate", () => {
    const page = readFileSync("src/app/onboarding/page.tsx", "utf8");

    assert.match(page, /nextOnboardingActions\(state\)/);
    assert.match(page, /const visibleMissingSteps = nextActions\.length \? nextActions : missingSteps/);
    assert.match(page, /Complete next: \{visibleMissingSteps\.join\(", "\)\}\./);
    assert.match(page, /disabled=\{Boolean\(missingSteps\.length\)\}/);
  });
});
