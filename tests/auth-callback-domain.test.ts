import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authCallbackErrorMessage } from "../src/lib/auth-callback-domain";

describe("auth callback errors", () => {
  it("prefers provider error descriptions", () => {
    assert.equal(
      authCallbackErrorMessage({
        code: null,
        providerError: "access_denied",
        providerErrorDescription: "Email link expired"
      }),
      "Email link expired"
    );
  });

  it("explains missing and failed code exchanges", () => {
    assert.equal(authCallbackErrorMessage({ code: null }), "Missing auth callback code. Please sign in again.");
    assert.equal(authCallbackErrorMessage({ code: "abc", exchangeError: "Invalid code" }), "Invalid code");
    assert.equal(authCallbackErrorMessage({ code: "abc" }), null);
  });
});
