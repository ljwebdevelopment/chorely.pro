import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  childArchiveFailureMessage,
  childAvatarUrlError,
  childNameError,
  childPinIsValid,
  childPinRequirementError,
  childSaveFailureMessage
} from "../src/lib/child-domain";

describe("child PIN policy", () => {
  it("accepts only 4 to 8 digit PINs", () => {
    assert.equal(childPinIsValid("1234"), true);
    assert.equal(childPinIsValid("12345678"), true);
    assert.equal(childPinIsValid("123"), false);
    assert.equal(childPinIsValid("123456789"), false);
    assert.equal(childPinIsValid("12ab"), false);
  });

  it("requires a PIN when creating a child but allows blank on edit", () => {
    assert.equal(childPinRequirementError({ isNewChild: true, pin: "" }), "Child PIN must be 4 to 8 digits.");
    assert.equal(childPinRequirementError({ isNewChild: true, pin: "1234" }), null);
    assert.equal(childPinRequirementError({ isNewChild: false, pin: "" }), null);
    assert.equal(childPinRequirementError({ isNewChild: false, pin: "99" }), "Child PIN must be 4 to 8 digits.");
  });

  it("validates child profile text fields", () => {
    assert.equal(childNameError(""), "Child name is required.");
    assert.equal(childNameError("   "), "Child name is required.");
    assert.equal(childNameError("Avery"), null);
    assert.equal(childNameError("x".repeat(81)), "Child name must be 80 characters or fewer.");
    assert.equal(childAvatarUrlError(""), null);
    assert.equal(childAvatarUrlError("https://example.com/avatar.png"), null);
    assert.equal(childAvatarUrlError("http://example.com/avatar.png"), null);
    assert.equal(childAvatarUrlError(`https://example.com/${"x".repeat(481)}`), "Avatar URL must be 500 characters or fewer.");
    assert.equal(childAvatarUrlError("ftp://example.com/avatar.png"), "Avatar URL must be a valid http or https URL.");
    assert.equal(childAvatarUrlError("not a url"), "Avatar URL must be a valid http or https URL.");
  });

  it("explains child archive failures", () => {
    assert.equal(
      childArchiveFailureMessage({ target: "child", wroteRow: false }),
      "This child profile could not be found. Please refresh and try again."
    );
    assert.equal(childArchiveFailureMessage({ target: "child", wroteRow: true }), "Unable to archive child right now.");
    assert.equal(
      childArchiveFailureMessage({ target: "assignments" }),
      "Child was archived, but chore assignments could not be cleared."
    );
    assert.equal(
      childArchiveFailureMessage({ target: "completions" }),
      "Child was archived, but pending chore completions could not be cleared."
    );
  });

  it("explains child save follow-up failures", () => {
    assert.equal(
      childSaveFailureMessage({ target: "child", wroteRow: false }),
      "Child profile could not be saved. Please refresh and try again."
    );
    assert.equal(childSaveFailureMessage({ target: "pin" }), "Child profile was saved, but the PIN could not be saved.");
    assert.equal(
      childSaveFailureMessage({ target: "onboarding" }),
      "Child profile was saved, but onboarding progress could not be updated."
    );
  });
});
