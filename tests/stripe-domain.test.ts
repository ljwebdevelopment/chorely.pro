import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  statusFromCheckoutCompletion,
  stripeCheckoutBlockedMessage,
  stripeConfigurationFailureMessage,
  stripePersistenceFailureMessage,
  stripeSessionFailureMessage,
  subscriptionRowFromCheckout,
  subscriptionRowFromStripe
} from "../src/lib/stripe-domain";

describe("Stripe subscription row mapping", () => {
  it("maps Stripe subscription events into persisted subscription status", () => {
    const row = subscriptionRowFromStripe({
      userId: "user-1",
      customerId: "cus_123",
      subscriptionId: "sub_123",
      status: "active",
      priceId: "price_123",
      currentPeriodEndSeconds: 1800000000,
      cancelAtPeriodEnd: false,
      updatedAt: new Date("2026-06-01T12:00:00.000Z")
    });

    assert.deepEqual(row, {
      user_id: "user-1",
      stripe_customer_id: "cus_123",
      stripe_subscription_id: "sub_123",
      status: "active",
      price_id: "price_123",
      current_period_end: "2027-01-15T08:00:00.000Z",
      cancel_at_period_end: false,
      updated_at: "2026-06-01T12:00:00.000Z"
    });
  });

  it("records checkout completion as incomplete until subscription webhook confirms status", () => {
    const row = subscriptionRowFromCheckout({
      userId: "user-2",
      customerId: "cus_456",
      subscriptionId: "sub_456",
      updatedAt: new Date("2026-06-01T13:00:00.000Z")
    });

    assert.deepEqual(row, {
      user_id: "user-2",
      stripe_customer_id: "cus_456",
      stripe_subscription_id: "sub_456",
      status: "incomplete",
      updated_at: "2026-06-01T13:00:00.000Z"
    });
  });

  it("does not let late checkout completion downgrade confirmed subscription state", () => {
    assert.equal(
      statusFromCheckoutCompletion({
        subscriptionId: "sub_456",
        existingSubscriptionId: "sub_456",
        existingStatus: "active"
      }),
      "active"
    );

    const row = subscriptionRowFromCheckout({
      userId: "user-2",
      customerId: "cus_456",
      subscriptionId: "sub_456",
      existingSubscriptionId: "sub_456",
      existingStatus: "trialing",
      updatedAt: new Date("2026-06-01T13:00:00.000Z")
    });

    assert.equal(row.status, "trialing");
  });

  it("treats checkout completion for a new subscription as provisional", () => {
    assert.equal(
      statusFromCheckoutCompletion({
        subscriptionId: "sub_new",
        existingSubscriptionId: "sub_old",
        existingStatus: "canceled"
      }),
      "incomplete"
    );
  });

  it("explains Stripe persistence failures", () => {
    assert.equal(stripePersistenceFailureMessage({ target: "checkout" }), "Unable to prepare checkout right now. Please try again.");
    assert.equal(stripePersistenceFailureMessage({ target: "webhook" }), "Unable to persist Stripe subscription event.");
  });

  it("explains Stripe session creation failures", () => {
    assert.equal(stripeSessionFailureMessage({ target: "checkout" }), "Unable to start Stripe checkout right now. Please try again.");
    assert.equal(stripeSessionFailureMessage({ target: "portal" }), "Unable to open the Stripe billing portal right now.");
  });

  it("explains blocked duplicate checkout attempts", () => {
    assert.equal(stripeCheckoutBlockedMessage(), "You already have an active Chorely subscription.");
  });

  it("explains missing Stripe configuration without exposing environment variable names to customers", () => {
    assert.equal(stripeConfigurationFailureMessage({ target: "checkout" }), "Checkout is not configured for this deployment yet.");
    assert.equal(stripeConfigurationFailureMessage({ target: "portal" }), "The Stripe billing portal is not configured for this deployment yet.");
    assert.equal(stripeConfigurationFailureMessage({ target: "webhook" }), "Stripe webhooks are not configured for this deployment yet.");
  });
});
