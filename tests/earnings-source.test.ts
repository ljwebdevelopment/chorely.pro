import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("earnings source safeguards", () => {
  it("keeps approved earnings totals and histories scoped to approved ledger rows", () => {
    const earningsPage = readFileSync("src/app/(app)/earnings/page.tsx", "utf8");
    const childDetailPage = readFileSync("src/app/(app)/children/[id]/page.tsx", "utf8");

    assert.match(
      earningsPage,
      /\.from\("earnings_ledger"\)[\s\S]*?\.eq\("household_id", householdId\)[\s\S]*?\.eq\("status", "approved"\)[\s\S]*?\.order\("created_at", \{ ascending: false \}\)/
    );
    assert.match(earningsPage, /\.select\("id,child_id,amount_cents,memo,created_at,children\(name\),chores\(title\)"\)/);
    assert.doesNotMatch(earningsPage, /select\("\*,children\(name\),chores\(title\)"\)/);
    assert.match(
      childDetailPage,
      /\.from\("earnings_ledger"\)[\s\S]*?\.eq\("household_id", householdId\)[\s\S]*?\.eq\("child_id", id\)[\s\S]*?\.eq\("status", "approved"\)[\s\S]*?\.order\("created_at", \{ ascending: false \}\)/
    );
  });
});
