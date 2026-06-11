import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parentPinError,
  parseActiveProfile,
  profileInitials,
  profileRedirectPath,
  serializeActiveProfile
} from "../src/lib/profile-domain";

const childId = "9a9f9079-030b-4db0-8320-0cc4c9e725e4";

describe("active profile cookie", () => {
  it("round-trips parent and child profiles", () => {
    assert.deepEqual(parseActiveProfile("parent"), { type: "parent" });
    assert.deepEqual(parseActiveProfile(`child:${childId}`), { type: "child", childId });
    assert.equal(serializeActiveProfile({ type: "parent" }), "parent");
    assert.equal(serializeActiveProfile({ type: "child", childId }), `child:${childId}`);
  });

  it("rejects malformed cookie values", () => {
    assert.equal(parseActiveProfile(null), null);
    assert.equal(parseActiveProfile(""), null);
    assert.equal(parseActiveProfile("admin"), null);
    assert.equal(parseActiveProfile("child:not-a-uuid"), null);
    assert.equal(parseActiveProfile("child:"), null);
  });
});

describe("profile route gates", () => {
  it("sends signed-in users without a profile to the switcher", () => {
    assert.equal(profileRedirectPath({ pathname: "/dashboard", cookieValue: null }), "/profiles");
    assert.equal(profileRedirectPath({ pathname: "/child", cookieValue: undefined }), "/profiles");
    assert.equal(profileRedirectPath({ pathname: "/chores/new", cookieValue: "" }), "/profiles");
  });

  it("keeps onboarding, billing, and the switcher reachable without a profile", () => {
    assert.equal(profileRedirectPath({ pathname: "/onboarding", cookieValue: null }), null);
    assert.equal(profileRedirectPath({ pathname: "/account/billing", cookieValue: null }), null);
    assert.equal(profileRedirectPath({ pathname: "/profiles", cookieValue: null }), null);
  });

  it("keeps child profiles inside the kids' view", () => {
    const cookieValue = `child:${childId}`;
    assert.equal(profileRedirectPath({ pathname: "/dashboard", cookieValue }), "/child");
    assert.equal(profileRedirectPath({ pathname: "/approvals", cookieValue }), "/child");
    assert.equal(profileRedirectPath({ pathname: "/account/security", cookieValue }), "/child");
    assert.equal(profileRedirectPath({ pathname: "/child", cookieValue }), null);
  });

  it("never loops a child profile through the subscription-required redirect", () => {
    assert.equal(profileRedirectPath({ pathname: "/account/billing", cookieValue: `child:${childId}` }), null);
  });

  it("lets parents go anywhere", () => {
    assert.equal(profileRedirectPath({ pathname: "/dashboard", cookieValue: "parent" }), null);
    assert.equal(profileRedirectPath({ pathname: "/child", cookieValue: "parent" }), null);
    assert.equal(profileRedirectPath({ pathname: "/account", cookieValue: "parent" }), null);
  });
});

describe("profile helpers", () => {
  it("builds friendly initials", () => {
    assert.equal(profileInitials("Luke"), "L");
    assert.equal(profileInitials("Emily Hullinger"), "EH");
    assert.equal(profileInitials("  "), "?");
  });

  it("validates parent PINs like child PINs", () => {
    assert.equal(parentPinError("1234"), null);
    assert.equal(parentPinError("12345678"), null);
    assert.match(parentPinError("123") || "", /4 to 8 digits/);
    assert.match(parentPinError("abcd") || "", /4 to 8 digits/);
  });
});
