import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { billingErrorMessage, canOpenBillingPortal, isSubscriptionActive, shouldShowCheckout, subscriptionStatusLabel } from "../src/lib/billing-domain";

describe("billing status presentation", () => {
  it("treats active and trialing subscriptions as dashboard-eligible", () => {
    assert.equal(isSubscriptionActive("active"), true);
    assert.equal(isSubscriptionActive("trialing"), true);
    assert.equal(isSubscriptionActive("past_due"), false);
    assert.equal(isSubscriptionActive("none"), false);
  });

  it("keeps checkout visible for inactive subscription states", () => {
    assert.equal(shouldShowCheckout("active"), false);
    assert.equal(shouldShowCheckout("trialing"), false);
    assert.equal(shouldShowCheckout("past_due"), true);
    assert.equal(shouldShowCheckout("canceled"), true);
    assert.equal(shouldShowCheckout("none"), true);
  });

  it("allows the Stripe portal whenever a customer exists", () => {
    assert.equal(canOpenBillingPortal("cus_123"), true);
    assert.equal(canOpenBillingPortal(null), false);
  });

  it("shows parent-friendly subscription status labels", () => {
    assert.equal(subscriptionStatusLabel("active"), "Active");
    assert.equal(subscriptionStatusLabel("past_due"), "Past due");
    assert.equal(subscriptionStatusLabel("active", true), "Active, cancels at period end");
  });

  it("maps billing redirect errors to safe customer-facing copy", () => {
    assert.equal(billingErrorMessage(null), null);
    assert.equal(billingErrorMessage("no-customer"), "Start checkout before opening the billing portal.");
    assert.equal(
      billingErrorMessage("Stripe API key expired: sk_live_secret"),
      "Billing action could not be completed right now. Please try again."
    );
    assert.equal(
      billingErrorMessage("You already have an active Chorely subscription."),
      "You already have an active Chorely subscription."
    );
  });
});
