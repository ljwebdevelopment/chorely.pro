import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("notification surface safeguards", () => {
  it("keeps dashboard recent activity ordered by latest notifications, not just unread rows", () => {
    const dashboardPage = readFileSync("src/app/(app)/dashboard/page.tsx", "utf8");

    assert.match(dashboardPage, /\.select\("id,title,body,created_at,read_at"\)/);
    assert.match(dashboardPage, /\.order\("created_at", \{ ascending: false \}\)/);
    assert.doesNotMatch(dashboardPage, /\.from\("notifications"\)[\s\S]*?\.is\("read_at", null\)[\s\S]*?\.limit\(5\)/);
    assert.match(dashboardPage, /notification\.read_at \? "read" : "unread"/);
  });

  it("shows real weekly dashboard activity instead of approval-only placeholder copy", () => {
    const dashboardPage = readFileSync("src/app/(app)/dashboard/page.tsx", "utf8");

    assert.match(dashboardPage, /import \{ weeklyActivityStats \} from "@\/lib\/report-domain"/);
    assert.match(dashboardPage, /label: "Weekly progress"/);
    assert.match(dashboardPage, /\.in\("status", \["collecting", "pending", "approved", "rejected", "redo_requested"\]\)/);
    assert.match(dashboardPage, /const weekly = weeklyActivityStats\(weeklyCompletionRows\)/);
    assert.match(dashboardPage, /Last 7 days: \{weekly\.pending\} pending, \{weekly\.redoRequested\} redo requested, and \{weekly\.rejected\} rejected\./);
    assert.doesNotMatch(dashboardPage, /Reviews are waiting\./);
    assert.doesNotMatch(dashboardPage, /All caught up\./);
  });
});
