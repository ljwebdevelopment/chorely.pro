import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("notification configuration safeguards", () => {
  it("keeps missing admin configuration on safe notification side-effect paths", () => {
    const notifications = readFileSync("src/lib/notifications.ts", "utf8");
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.match(notifications, /if \(!process\.env\.SUPABASE_SERVICE_ROLE_KEY\) \{/);
    assert.match(notifications, /return \{ error: new Error\("Notification service is not configured\."\) \}/);
    assert.match(actions, /if \(notificationError\) \{/);
    assert.doesNotMatch(actions, /notificationError\.message/);
  });
});
