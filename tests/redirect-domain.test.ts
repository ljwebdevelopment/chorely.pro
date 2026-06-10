import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeRedirectPath } from "../src/lib/redirect-domain";

describe("safe auth redirects", () => {
  it("allows relative application paths with query strings", () => {
    assert.equal(safeRedirectPath("/dashboard?checkout=success"), "/dashboard?checkout=success");
    assert.equal(safeRedirectPath("/account/billing#plans"), "/account/billing#plans");
  });

  it("rejects external, protocol-relative, malformed, and suspicious paths", () => {
    assert.equal(safeRedirectPath("https://evil.example"), "/dashboard");
    assert.equal(safeRedirectPath("//evil.example/path"), "/dashboard");
    assert.equal(safeRedirectPath("/https://evil.example"), "/dashboard");
    assert.equal(safeRedirectPath("\\dashboard"), "/dashboard");
    assert.equal(safeRedirectPath(""), "/dashboard");
  });

  it("uses the provided fallback", () => {
    assert.equal(safeRedirectPath("https://evil.example", "/"), "/");
  });
});
