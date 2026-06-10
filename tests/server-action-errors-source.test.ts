import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("server action error surfaces", () => {
  it("does not redirect raw persistence error messages to users", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");
    const persistenceErrors = [
      "activeChildrenError",
      "activeChoresError",
      "approvedExampleError",
      "assignmentError",
      "assignmentsError",
      "childError",
      "childrenError",
      "choreError",
      "completionError",
      "completionsError",
      "dataError",
      "deleteAssignmentsError",
      "eventError",
      "existingError",
      "insertAssignmentsError",
      "ledgerError",
      "memberError",
      "notificationError",
      "onboardingError",
      "pinError",
      "profileError",
      "reviewError",
      "stateError"
    ];

    for (const name of persistenceErrors) {
      assert.doesNotMatch(actions, new RegExp(`${name}\\??\\.message`), `${name}.message should not be user-visible`);
    }

    assert.doesNotMatch(actions, /\?\.message \|\|/);
    assert.doesNotMatch(actions, /\.message \|\|/);
  });
});
