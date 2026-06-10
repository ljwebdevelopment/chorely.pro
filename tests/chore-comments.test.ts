import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  choreCommentAlertOptions,
  choreCommentKindLabel,
  choreCommentTextError,
  normalizeChoreCommentAlert,
  normalizeChoreCommentKind
} from "../src/lib/chore-comment-domain";

describe("chore comments and supply alerts", () => {
  it("keeps the requested household quick alerts available", () => {
    assert.deepEqual(choreCommentAlertOptions, [
      "Out of cat food",
      "Out of dog food",
      "No cleaning supplies",
      "Need trash bags",
      "Need laundry detergent",
      "Need paper towels",
      "Need toilet paper",
      "Vacuum not working",
      "Couldn't complete chore"
    ]);
  });

  it("validates custom chore notes and normalizes note types", () => {
    assert.equal(choreCommentTextError("Need more paper towels"), null);
    assert.equal(choreCommentTextError("   "), "Add a household note or choose a quick issue before saving.");
    assert.equal(choreCommentTextError("x".repeat(501)), "Chore notes must be 500 characters or fewer.");

    assert.equal(normalizeChoreCommentKind("supply_note"), "supply_note");
    assert.equal(normalizeChoreCommentKind("chore_issue"), "chore_issue");
    assert.equal(normalizeChoreCommentKind("bad"), "household_note");
    assert.equal(normalizeChoreCommentAlert("Need trash bags"), "Need trash bags");
    assert.equal(normalizeChoreCommentAlert("Need glitter"), null);
    assert.equal(choreCommentKindLabel("supply_note"), "Supply Note");
    assert.equal(choreCommentKindLabel("chore_issue"), "Chore Issue");
    assert.equal(choreCommentKindLabel("household_note"), "Household Note");
  });
});
