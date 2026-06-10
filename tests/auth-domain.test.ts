import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authProviderFailureMessage,
  deleteAccountConfirmationError,
  deleteAccountConfigurationFailureMessage,
  deleteAccountFailureMessage,
  deleteAccountSubscriptionFailureMessage,
  householdNameError,
  householdWriteFailureMessage,
  passwordConfirmationError,
  profileNameError,
  profileWriteFailureMessage,
  shouldCancelSubscriptionBeforeAccountDeletion
} from "../src/lib/auth-domain";

describe("auth form validation", () => {
  it("uses safe provider failure copy for auth actions", () => {
    assert.equal(authProviderFailureMessage({ action: "sign-up" }), "Unable to create your account right now. Please try again.");
    assert.equal(authProviderFailureMessage({ action: "sign-in" }), "Unable to sign in with those credentials.");
    assert.equal(
      authProviderFailureMessage({ action: "password-reset" }),
      "Unable to send a password reset email right now. Please try again."
    );
    assert.equal(authProviderFailureMessage({ action: "password-update" }), "Unable to update your password right now. Please try again.");
  });

  it("requires password length and matching confirmation", () => {
    assert.equal(passwordConfirmationError({ password: "short", confirmation: "short" }), "Password must be at least 8 characters.");
    assert.equal(
      passwordConfirmationError({ password: "responsible-123", confirmation: "different-123" }),
      "Password confirmation does not match."
    );
    assert.equal(passwordConfirmationError({ password: "responsible-123", confirmation: "responsible-123" }), null);
  });

  it("requires typed account deletion confirmation", () => {
    assert.equal(deleteAccountConfirmationError(""), "Type DELETE to confirm account deletion.");
    assert.equal(deleteAccountConfirmationError("delete"), null);
    assert.equal(deleteAccountConfirmationError(" DELETE "), null);
  });

  it("explains failed account deletion", () => {
    assert.equal(deleteAccountFailureMessage(), "Unable to delete your account right now. Please try again or contact support.");
    assert.equal(
      deleteAccountConfigurationFailureMessage(),
      "Account deletion is not configured for this deployment yet. Please contact support."
    );
  });

  it("requires Stripe cancellation before deleting accounts with active subscription records", () => {
    assert.equal(shouldCancelSubscriptionBeforeAccountDeletion({ stripeSubscriptionId: "sub_123", status: "active" }), true);
    assert.equal(shouldCancelSubscriptionBeforeAccountDeletion({ stripeSubscriptionId: "sub_123", status: "trialing" }), true);
    assert.equal(shouldCancelSubscriptionBeforeAccountDeletion({ stripeSubscriptionId: "sub_123", status: "canceled" }), false);
    assert.equal(shouldCancelSubscriptionBeforeAccountDeletion({ stripeSubscriptionId: null, status: "active" }), false);
  });

  it("explains Stripe cancellation failures before account deletion", () => {
    assert.equal(
      deleteAccountSubscriptionFailureMessage({ target: "configuration" }),
      "Billing is not configured, so your subscription could not be canceled before account deletion."
    );
    assert.equal(
      deleteAccountSubscriptionFailureMessage({ target: "stripe" }),
      "Your Stripe subscription could not be canceled. Please try again or use billing settings before deleting your account."
    );
  });

  it("explains profile save failures", () => {
    assert.equal(profileNameError(""), null);
    assert.equal(profileNameError("A responsible parent"), null);
    assert.equal(profileNameError("x".repeat(101)), "Full name must be 100 characters or fewer.");
    assert.equal(profileWriteFailureMessage({ wroteRow: false }), "Your profile could not be found. Please refresh and try again.");
    assert.equal(profileWriteFailureMessage({ wroteRow: true }), "Unable to save profile right now.");
  });

  it("validates and explains household settings writes", () => {
    assert.equal(householdNameError(""), "Household name is required.");
    assert.equal(householdNameError("  "), "Household name is required.");
    assert.equal(householdNameError("The CHORELY Household"), null);
    assert.equal(householdNameError("x".repeat(81)), "Household name must be 80 characters or fewer.");
    assert.equal(
      householdWriteFailureMessage({ wroteRow: false }),
      "Your household could not be found. Please finish onboarding or refresh and try again."
    );
    assert.equal(householdWriteFailureMessage({ wroteRow: true }), "Unable to save household settings right now.");
  });
});
