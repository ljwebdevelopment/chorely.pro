import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  approvalNoteError,
  approvalSideEffectFailureMessage,
  canReviewCompletion,
  isReviewAction,
  reviewWriteFailureMessage
} from "../src/lib/approval-domain";

describe("approval review rules", () => {
  it("allows only pending completions to be reviewed", () => {
    assert.equal(canReviewCompletion("pending"), true);
    assert.equal(canReviewCompletion("collecting"), false);
    assert.equal(canReviewCompletion("approved"), false);
    assert.equal(canReviewCompletion("rejected"), false);
    assert.equal(canReviewCompletion("redo_requested"), false);
  });

  it("accepts only known review actions", () => {
    assert.equal(isReviewAction("approved"), true);
    assert.equal(isReviewAction("rejected"), true);
    assert.equal(isReviewAction("redo_requested"), true);
    assert.equal(isReviewAction("pending"), false);
    assert.equal(isReviewAction("delete"), false);
  });

  it("explains stale review writes before ledger payouts can be created", () => {
    assert.equal(reviewWriteFailureMessage({ wroteRow: false }), "This completion was already reviewed by another action.");
    assert.equal(reviewWriteFailureMessage({ wroteRow: true }), "Unable to record this review right now.");
  });

  it("validates approval review notes before event writes", () => {
    assert.equal(approvalNoteError("Redo requested because the chore was incomplete."), null);
    assert.equal(approvalNoteError("x".repeat(501)), "Review note must be 500 characters or fewer.");
  });

  it("explains approval side-effect failures after the review is recorded", () => {
    assert.equal(
      approvalSideEffectFailureMessage({ target: "earnings" }),
      "The review was recorded, but earnings could not be added. Please retry from the earnings history or contact support."
    );
    assert.equal(
      approvalSideEffectFailureMessage({ target: "event" }),
      "The review was recorded, but the audit event could not be saved."
    );
    assert.equal(
      approvalSideEffectFailureMessage({ target: "onboarding" }),
      "The review was recorded, but onboarding progress could not be updated."
    );
    assert.equal(
      approvalSideEffectFailureMessage({ target: "notification" }),
      "The review was recorded, but the notification could not be saved."
    );
  });
});
