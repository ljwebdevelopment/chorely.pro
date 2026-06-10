import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("historical reporting source safeguards", () => {
  it("renders household completion counts that are calculated for reports", () => {
    const reportsPage = readFileSync("src/app/(app)/reports/page.tsx", "utf8");

    assert.match(
      reportsPage,
      /const \{ totalCompletions, approvedCompletions, completionPercentage \} = householdCompletionStats\(completionRows\)/
    );
    assert.match(reportsPage, /<div className="stat"><span>Total submissions<\/span><strong>\{totalCompletions\}<\/strong><\/div>/);
    assert.match(reportsPage, /<div className="stat"><span>Approved completions<\/span><strong>\{approvedCompletions\}<\/strong><\/div>/);
  });

  it("keeps archived children and chores in historical reports while counting active records separately", () => {
    const reportsPage = readFileSync("src/app/(app)/reports/page.tsx", "utf8");
    const earningsPage = readFileSync("src/app/(app)/earnings/page.tsx", "utf8");

    assert.match(reportsPage, /\.from\("chores"\)\.select\("id,title,active"\)\.eq\("household_id", householdId\)/);
    assert.match(reportsPage, /\.from\("children"\)\.select\("id,name,archived_at"\)\.eq\("household_id", householdId\)/);
    assert.match(reportsPage, /const activeChildren = childRows\.filter\(\(child\) => !child\.archived_at\)/);
    assert.match(reportsPage, /const activeChores = choreRows\.filter\(\(chore\) => chore\.active\)/);
    assert.doesNotMatch(reportsPage, /Report children[\s\S]*?\.is\("archived_at", null\)/);

    assert.match(earningsPage, /\.from\("children"\)\.select\("id,name,archived_at"\)\.eq\("household_id", householdId\)/);
    assert.doesNotMatch(earningsPage, /Child profiles[\s\S]*?\.is\("archived_at", null\)/);
  });
});
