import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appContextOptionsForSetupAction,
  exampleCompletionFailureMessage,
  householdAlreadyExistsMessage,
  householdSetupFailureMessage,
  isOnboardingSource,
  setupActionErrorPath
} from "../src/lib/onboarding-domain";

describe("onboarding setup gating", () => {
  it("allows tutorial-scoped setup actions before subscription-gated dashboard access", () => {
    assert.equal(isOnboardingSource("onboarding"), true);
    assert.deepEqual(appContextOptionsForSetupAction("onboarding"), {});
  });

  it("requires a subscription for normal app setup actions", () => {
    assert.equal(isOnboardingSource(null), false);
    assert.deepEqual(appContextOptionsForSetupAction(null), { requireSubscription: true });
    assert.deepEqual(appContextOptionsForSetupAction("app"), { requireSubscription: true });
  });

  it("keeps setup errors inside onboarding when actions are tutorial-scoped", () => {
    assert.equal(
      setupActionErrorPath({
        source: "onboarding",
        fallbackPath: "/children",
        step: "children",
        message: "PIN required"
      }),
      "/onboarding?step=children&error=PIN+required"
    );
    assert.equal(
      setupActionErrorPath({
        source: null,
        fallbackPath: "/children",
        step: "children",
        message: "PIN required"
      }),
      "/children?error=PIN+required"
    );
  });
});

describe("onboarding write failure copy", () => {
  it("explains household setup follow-up failures", () => {
    assert.equal(householdAlreadyExistsMessage(), "Your household already exists. Continue setup from the next step.");
    assert.equal(householdSetupFailureMessage({ target: "household", wroteRow: false }), "Household could not be created. Please refresh and try again.");
    assert.equal(householdSetupFailureMessage({ target: "member", wroteRow: false }), "Household was created, but your parent access could not be saved.");
    assert.equal(householdSetupFailureMessage({ target: "state", wroteRow: false }), "Household was created, but onboarding could not be updated.");
  });

  it("explains example completion follow-up failures", () => {
    assert.equal(
      exampleCompletionFailureMessage({ target: "completion", wroteRow: false }),
      "Example completion could not be created. Please refresh and try again."
    );
    assert.equal(
      exampleCompletionFailureMessage({ target: "notification", wroteRow: false }),
      "Example completion was created, but the approval notification could not be saved."
    );
  });
});
