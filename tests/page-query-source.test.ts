import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("page query source safeguards", () => {
  it("keeps child and chore page reads scoped to rendered fields", () => {
    const childPage = readFileSync("src/app/(app)/child/page.tsx", "utf8");
    const childDetailPage = readFileSync("src/app/(app)/children/[id]/page.tsx", "utf8");
    const childrenPage = readFileSync("src/app/(app)/children/page.tsx", "utf8");
    const choresPage = readFileSync("src/app/(app)/chores/page.tsx", "utf8");
    const newChorePage = readFileSync("src/app/(app)/chores/new/page.tsx", "utf8");
    const editChorePage = readFileSync("src/app/(app)/chores/[id]/edit/page.tsx", "utf8");
    const notificationsPage = readFileSync("src/app/(app)/notifications/page.tsx", "utf8");
    const onboardingPage = readFileSync("src/app/onboarding/page.tsx", "utf8");

    assert.match(childPage, /from\("children"\)\.select\("id,name"\)/);
    assert.match(childDetailPage, /from\("children"\)\.select\("id,name,avatar_url"\)/);
    assert.match(
      childPage,
      /select\("id,title,description,reward_cents,frequency,custom_schedule,created_at,chore_assignments\(child_id\)"\)/
    );
    assert.match(childrenPage, /from\("children"\)\.select\("id,name,avatar_url,created_at"\)/);
    assert.match(
      choresPage,
      /select\("id,title,reward_cents,frequency,shared_completion_mode,created_at,chore_assignments\(children\(name\)\)"\)/
    );
    assert.match(newChorePage, /from\("children"\)[\s\S]*?\.select\("id,name,avatar_url"\)/);
    assert.match(notificationsPage, /from\("notifications"\)[\s\S]*?\.select\("id,title,body,created_at,read_at"\)/);
    assert.match(onboardingPage, /from\("children"\)\.select\("id,name,avatar_url"\)/);
    assert.match(onboardingPage, /from\("chores"\)\.select\("id"\)/);
    assert.match(
      onboardingPage,
      /from\("onboarding_state"\)[\s\S]*?\.select\("household_created,children_added,rewards_set,first_chore_created,example_approved,earnings_reviewed,pwa_reviewed"\)/
    );
    assert.match(
      editChorePage,
      /select\("id,title,description,reward_cents,frequency,custom_schedule,shared_completion_mode"\)/
    );
    assert.match(editChorePage, /from\("children"\)\.select\("id,name,avatar_url"\)/);
    assert.doesNotMatch(childPage, /select\("\*"\)/);
    assert.doesNotMatch(childDetailPage, /select\("\*"\)/);
    assert.doesNotMatch(childrenPage, /select\("\*"\)/);
    assert.doesNotMatch(choresPage, /select\("\*[^"]*"\)/);
    assert.doesNotMatch(newChorePage, /select\("\*"\)/);
    assert.doesNotMatch(editChorePage, /select\("\*"\)/);
    assert.doesNotMatch(notificationsPage, /select\("\*"\)/);
    assert.doesNotMatch(onboardingPage, /select\("\*"\)/);
  });
});
