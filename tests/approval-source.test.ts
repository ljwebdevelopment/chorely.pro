import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const approvalsPageSource = readFileSync("src/app/(app)/approvals/page.tsx", "utf8");

describe("approvals page source", () => {
  it("shows participant and payout details before parents review split-payment completions", () => {
    assert.match(approvalsPageSource, /completed_together/);
    assert.match(approvalsPageSource, /completed_by_child_id/);
    assert.match(approvalsPageSource, /participant_child_ids/);
    assert.match(approvalsPageSource, /chores\(title,reward_cents\)/);
    assert.match(approvalsPageSource, /from\("children"\)\.select\("id,name"\)/);
    assert.match(approvalsPageSource, /shouldSplitCompletionReward/);
    assert.match(approvalsPageSource, /splitRewardCents/);
    assert.match(approvalsPageSource, /Participants:/);
    assert.match(approvalsPageSource, /Approval will split/);
    assert.match(approvalsPageSource, /Approval will award/);
  });

  it("refreshes every surface affected by approval reviews", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");
    const reviewAction = actions.match(/export async function reviewCompletionAction[\s\S]*?export async function submitExampleCompletionAction/)?.[0] || "";

    assert.match(reviewAction, /revalidatePath\("\/approvals"\)/);
    assert.match(reviewAction, /revalidatePath\("\/earnings"\)/);
    assert.match(reviewAction, /revalidatePath\("\/dashboard"\)/);
    assert.match(reviewAction, /revalidatePath\("\/child"\)/);
    assert.match(reviewAction, /revalidatePath\("\/reports"\)/);
    assert.match(reviewAction, /revalidatePath\("\/notifications"\)/);
  });
});
