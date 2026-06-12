import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FOUNDING_TESTER_BADGE_LABEL,
  normalizePhone,
  volunteerAlreadyClaimedMessage,
  volunteerNotFoundMessage,
  volunteerVerificationError,
  volunteerVerificationExpiredMessage
} from "../src/lib/volunteer-domain";

describe("volunteer testing domain", () => {
  it("normalizes phone numbers to digits only", () => {
    assert.equal(normalizePhone("(918) 822-4311"), "9188224311");
    assert.equal(normalizePhone("918-822-4311"), "9188224311");
    assert.equal(normalizePhone(""), "");
  });

  it("requires both email and phone for verification", () => {
    assert.equal(
      volunteerVerificationError({ email: "", phone: "918-822-4311" }),
      "Enter the email address you used to sign up for testing."
    );
    assert.equal(
      volunteerVerificationError({ email: "ben@example.com", phone: "" }),
      "Enter the phone number you used to sign up for testing."
    );
    assert.equal(volunteerVerificationError({ email: "ben@example.com", phone: "918-822-4311" }), null);
  });

  it("provides stable user-facing messages", () => {
    assert.equal(
      volunteerNotFoundMessage(),
      "We couldn't match that email and phone number to an approved tester invite."
    );
    assert.equal(
      volunteerAlreadyClaimedMessage(),
      "This tester invite has already been used. Sign in with your existing account instead."
    );
    assert.equal(volunteerVerificationExpiredMessage(), "Your verification expired. Please verify your email and phone again.");
  });

  it("exposes the founding tester badge label", () => {
    assert.equal(FOUNDING_TESTER_BADGE_LABEL, "Founding Tester");
  });
});
