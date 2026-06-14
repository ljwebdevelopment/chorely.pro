import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("chore archive lifecycle safeguards", () => {
  it("does not load or update archived chores through edit flows", () => {
    const editPage = readFileSync("src/app/(app)/chores/[id]/edit/page.tsx", "utf8");
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.match(editPage, /\.eq\("active", true\)[\s\S]*?\.maybeSingle\(\)/);
    assert.match(actions, /\.update\(payload\)\.eq\("id", id\)\.eq\("household_id", context\.household\.id\)\.eq\("active", true\)/);
    assert.match(actions, /\.insert\(\{ \.\.\.payload, active: true \}\)/);
  });

  it("keeps archived chores out of delete, completion, and onboarding active paths", () => {
    const onboardingPage = readFileSync("src/app/onboarding/page.tsx", "utf8");
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.match(
      actions,
      /\.update\(\{ active: false \}\)[\s\S]*?\.eq\("id", id\)[\s\S]*?\.eq\("household_id", context\.household\.id\)[\s\S]*?\.eq\("active", true\)[\s\S]*?\.maybeSingle\(\)/
    );
    assert.match(
      actions,
      /\.from\("chores"\)[\s\S]*?\.select\("title,frequency,custom_schedule,created_at,shared_completion_mode"\)[\s\S]*?\.eq\("id", choreId\)[\s\S]*?\.eq\("household_id", context\.household\.id\)[\s\S]*?\.eq\("active", true\)[\s\S]*?\.single\(\)/
    );
    assert.match(onboardingPage, /\.from\("chores"\)\.select\("id"\)\.eq\("household_id", context\.household\.id\)\.eq\("active", true\)\.limit\(1\)/);
  });

  it("clears unresolved completions when chores are archived", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.match(actions, /\.from\("chore_completions"\)[\s\S]*?\.update\(\{ status: "rejected", reviewed_at: archivedAt, reviewed_by: context\.user\.id \}\)/);
    assert.match(actions, /\.eq\("chore_id", chore\.id\)/);
    assert.match(actions, /\.eq\("household_id", context\.household\.id\)/);
    assert.match(actions, /\.in\("status", \["collecting", "pending"\]\)/);
    assert.match(actions, /choreSaveFailureMessage\(\{ target: "completions" \}\)/);
    assert.match(actions, /revalidatePath\("\/approvals"\)/);
    assert.match(actions, /revalidatePath\("\/child"\)/);
    assert.match(actions, /revalidatePath\("\/earnings"\)/);
    assert.match(actions, /revalidatePath\("\/reports"\)/);
  });
});
