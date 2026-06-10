import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  missingOnboardingData,
  missingOnboardingSteps,
  nextOnboardingActions,
  onboardingCompletionWriteFailureMessage,
  onboardingReadyToComplete
} from "../src/lib/onboarding-domain";

describe("onboarding completion checklist", () => {
  it("reports missing setup steps before onboarding can be completed", () => {
    assert.deepEqual(
      missingOnboardingSteps({
        household_created: true,
        children_added: true,
        rewards_set: true,
        first_chore_created: false,
        example_approved: false,
        earnings_reviewed: false
      }),
      ["Create First Chore", "Approve Example Completion", "Review Earnings Dashboard"]
    );
    assert.equal(
      onboardingReadyToComplete({
        household_created: true,
        children_added: true,
        rewards_set: true,
        first_chore_created: false,
        example_approved: false,
        earnings_reviewed: false
      }),
      false
    );
  });

  it("allows completion only when all required setup steps are done", () => {
    const complete = {
      household_created: true,
      children_added: true,
      rewards_set: true,
      first_chore_created: true,
      example_approved: true,
      earnings_reviewed: true
    };

    assert.deepEqual(missingOnboardingSteps(complete), []);
    assert.equal(onboardingReadyToComplete(complete), true);
  });

  it("reports the next actionable onboarding step for guided setup messaging", () => {
    assert.deepEqual(nextOnboardingActions(null), ["Create Household"]);
    assert.deepEqual(
      nextOnboardingActions({
        household_created: true,
        children_added: false,
        rewards_set: false,
        first_chore_created: false,
        example_approved: false,
        earnings_reviewed: false
      }),
      ["Add Children and Set Chore Rewards"]
    );
    assert.deepEqual(
      nextOnboardingActions({
        household_created: true,
        children_added: true,
        rewards_set: true,
        first_chore_created: false,
        example_approved: false,
        earnings_reviewed: false
      }),
      ["Create First Chore"]
    );
    assert.deepEqual(
      nextOnboardingActions({
        household_created: true,
        children_added: true,
        rewards_set: true,
        first_chore_created: true,
        example_approved: true,
        earnings_reviewed: true
      }),
      []
    );
  });

  it("requires current setup data before final onboarding completion", () => {
    assert.deepEqual(
      missingOnboardingData({
        hasHousehold: true,
        activeChildrenCount: 1,
        activeChoresCount: 1,
        approvedExampleCount: 1
      }),
      []
    );

    assert.deepEqual(
      missingOnboardingData({
        hasHousehold: true,
        activeChildrenCount: 0,
        activeChoresCount: 0,
        approvedExampleCount: 0
      }),
      ["Add Children", "Create First Chore", "Approve Example Completion"]
    );
  });

  it("explains failed final onboarding writes before dashboard redirect", () => {
    assert.equal(
      onboardingCompletionWriteFailureMessage({ target: "state", wroteRow: false }),
      "Onboarding state could not be updated. Please refresh and try again."
    );
    assert.equal(
      onboardingCompletionWriteFailureMessage({ target: "profile", wroteRow: false }),
      "Your profile could not be marked as onboarded. Please refresh and try again."
    );
    assert.equal(onboardingCompletionWriteFailureMessage({ target: "profile", wroteRow: true }), "Unable to complete onboarding right now.");
  });
});
