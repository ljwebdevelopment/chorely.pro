import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("child archive lifecycle safeguards", () => {
  it("does not load, update, or archive already archived child profiles through active flows", () => {
    const detailPage = readFileSync("src/app/(app)/children/[id]/page.tsx", "utf8");
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.match(detailPage, /\.from\("children"\)\.select\("id,name,avatar_url"\)\.eq\("id", id\)\.eq\("household_id", householdId\)\.is\("archived_at", null\)\.maybeSingle\(\)/);
    assert.doesNotMatch(detailPage, /select\("\*"\)/);
    assert.match(
      actions,
      /\.update\(payload\)[\s\S]*?\.eq\("id", id\)[\s\S]*?\.eq\("household_id", context\.household\.id\)[\s\S]*?\.is\("archived_at", null\)[\s\S]*?\.maybeSingle\(\)/
    );
    assert.match(
      actions,
      /\.update\(\{ archived_at: new Date\(\)\.toISOString\(\) \}\)[\s\S]*?\.eq\("id", id\)[\s\S]*?\.eq\("household_id", context\.household\.id\)[\s\S]*?\.is\("archived_at", null\)[\s\S]*?\.maybeSingle\(\)/
    );
  });

  it("clears unresolved completions before archived children can be paid", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.match(actions, /\.from\("chore_completions"\)[\s\S]*?\.update\(\{ status: "rejected", reviewed_at: archivedAt, reviewed_by: context\.user\.id \}\)/);
    assert.match(actions, /\.in\("status", \["collecting", "pending"\]\)/);
    assert.match(actions, /\.or\(`completed_by_child_id\.eq\.\$\{id\},participant_child_ids\.cs\.\{\$\{id\}\}`\)/);
    assert.match(actions, /childArchiveFailureMessage\(\{ target: "completions" \}\)/);
    assert.match(actions, /revalidatePath\("\/approvals"\)/);
    assert.match(actions, /revalidatePath\("\/earnings"\)/);
    assert.match(actions, /revalidatePath\("\/reports"\)/);
  });
});
