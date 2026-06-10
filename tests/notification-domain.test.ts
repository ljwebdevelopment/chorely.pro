import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  notificationWriteFailureMessage,
  subscriptionNotificationForStatus,
  subscriptionNotificationPersistenceFailureMessage
} from "../src/lib/notification-domain";

describe("subscription notification messages", () => {
  it("creates alerts for subscription issue states", () => {
    assert.deepEqual(subscriptionNotificationForStatus("past_due"), {
      type: "subscription_past_due",
      title: "Subscription payment past due",
      body: "Update billing details to keep dashboard access active."
    });

    assert.deepEqual(subscriptionNotificationForStatus("canceled"), {
      type: "subscription_canceled",
      title: "Subscription canceled",
      body: "Subscribe again to regain dashboard access."
    });
  });

  it("creates cancellation-scheduled alerts without flagging healthy active renewals", () => {
    assert.equal(subscriptionNotificationForStatus("active"), null);
    assert.deepEqual(subscriptionNotificationForStatus("active", true), {
      type: "subscription_canceling",
      title: "Subscription cancellation scheduled",
      body: "Your Chorely access remains active until the current billing period ends."
    });
  });

  it("explains notification write failures", () => {
    assert.equal(
      notificationWriteFailureMessage({ action: "single", wroteRow: false }),
      "This notification could not be found or was already updated."
    );
    assert.equal(notificationWriteFailureMessage({ action: "single", wroteRow: true }), "Unable to mark this notification as read right now.");
    assert.equal(notificationWriteFailureMessage({ action: "all" }), "Unable to mark notifications as read right now.");
  });

  it("explains subscription notification persistence failures", () => {
    assert.equal(subscriptionNotificationPersistenceFailureMessage(), "Unable to persist subscription notification.");
  });
});
