import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("child-facing chore availability safeguards", () => {
  it("filters child view and dashboard due chores to active available child assignments", () => {
    const childPage = readFileSync("src/app/(app)/child/page.tsx", "utf8");
    const dashboardPage = readFileSync("src/app/(app)/dashboard/page.tsx", "utf8");

    assert.match(childPage, /activeAssignedChildIds\(\{ assignedChildIds: assignedIds, activeChildIds \}\)/);
    assert.match(childPage, /remainingCompletableChildIds/);
    assert.match(
      childPage,
      /return due && completableChildIds\.length[\s\S]*?\? \[\{ \.\.\.chore, activeAssignedIds: completableChildIds, totalAssignedChildIds: chore\.activeAssignedIds \}\][\s\S]*?: \[\]/
    );
    assert.match(dashboardPage, /\.select\("id,title,reward_cents,frequency,custom_schedule,created_at,chore_assignments\(child_id\)"\)/);
    assert.match(dashboardPage, /remainingCompletableChildIds/);
    assert.match(dashboardPage, /return completableChildIds\.length > 0 && isChoreDueOn/);
  });

  it("validates completion submissions against active household children", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.match(actions, /\.from\("children"\)\.select\("id"\)\.eq\("household_id", context\.household\.id\)\.is\("archived_at", null\)/);
    assert.match(
      actions,
      /const assignedChildIds = activeAssignedChildIds\(\{[\s\S]*?assignedChildIds: \(assignments \|\| \[\]\)\.map\(\(assignment\) => assignment\.child_id\),[\s\S]*?activeChildIds: activeChildren\.map\(\(child\) => child\.id\)[\s\S]*?\}\)/
    );
  });

  it("keeps child completion controls accessible and aligned with PIN policy", () => {
    const childPage = readFileSync("src/app/(app)/child/page.tsx", "utf8");

    assert.match(childPage, /id=\{`pin-\$\{chore\.id\}`\} name="pin" inputMode="numeric" minLength=\{4\} maxLength=\{8\} pattern="\[0-9\]\{4,8\}" required/);
    assert.match(childPage, /const completedTogetherAvailable = chore\.totalAssignedChildIds\.length > 1/);
    assert.match(childPage, /\{completedTogetherAvailable \? \(/);
    assert.match(childPage, /<fieldset className="field full checkbox-group">[\s\S]*?<legend>Completed Together participants<\/legend>/);
    assert.match(
      childPage,
      /htmlFor=\{`participant-\$\{chore\.id\}-\$\{child\.id\}`\}[\s\S]*?id=\{`participant-\$\{chore\.id\}-\$\{child\.id\}`\}/
    );
    assert.match(
      childPage,
      /htmlFor=\{`completed-together-\$\{chore\.id\}`\}[\s\S]*?id=\{`completed-together-\$\{chore\.id\}`\} type="checkbox" name="completed_together"/
    );
    assert.doesNotMatch(childPage, /name="completed_together" disabled=\{!chore\.split_payment_enabled\}/);
  });

  it("refreshes every chore-dependent surface after chore saves", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");
    const saveChoreAction = actions.match(/export async function saveChoreAction[\s\S]*?export async function deleteChoreAction/)?.[0] || "";

    assert.match(saveChoreAction, /revalidatePath\("\/chores"\)/);
    assert.match(saveChoreAction, /revalidatePath\("\/dashboard"\)/);
    assert.match(saveChoreAction, /revalidatePath\("\/child"\)/);
    assert.match(saveChoreAction, /revalidatePath\("\/onboarding"\)/);
    assert.match(saveChoreAction, /revalidatePath\("\/approvals"\)/);
    assert.match(saveChoreAction, /revalidatePath\("\/earnings"\)/);
    assert.match(saveChoreAction, /revalidatePath\("\/reports"\)/);
    assert.match(saveChoreAction, /revalidatePath\("\/notifications"\)/);
  });

  it("refreshes every child-dependent surface after child saves", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");
    const saveChildAction = actions.match(/export async function saveChildAction[\s\S]*?export async function archiveChildAction/)?.[0] || "";

    assert.match(saveChildAction, /revalidatePath\("\/children"\)/);
    assert.match(saveChildAction, /revalidatePath\("\/onboarding"\)/);
    assert.match(saveChildAction, /revalidatePath\("\/child"\)/);
    assert.match(saveChildAction, /revalidatePath\("\/dashboard"\)/);
    assert.match(saveChildAction, /revalidatePath\("\/approvals"\)/);
    assert.match(saveChildAction, /revalidatePath\("\/earnings"\)/);
    assert.match(saveChildAction, /revalidatePath\("\/reports"\)/);
  });
});
