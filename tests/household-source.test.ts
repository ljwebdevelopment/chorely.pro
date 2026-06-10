import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("household source safeguards", () => {
  it("does not create duplicate households for the same parent", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.match(actions, /if \(context\.household\) \{/);
    assert.match(actions, /householdAlreadyExistsMessage\(\)/);
    assert.match(actions, /redirect\(`\/onboarding\?step=children&error=/);
  });

  it("validates onboarding household names before creating households", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");
    const onboardingPage = readFileSync("src/app/onboarding/page.tsx", "utf8");
    const accountPage = readFileSync("src/app/account/page.tsx", "utf8");

    assert.match(actions, /const name = formString\(formData, "name", "My Household"\)/);
    assert.match(actions, /const nameError = householdNameError\(name\)/);
    assert.match(actions, /redirect\(`\/onboarding\?error=\$\{encodeURIComponent\(nameError\)\}`\)/);
    assert.match(actions, /\.insert\(\{ name, owner_id: context\.user\.id \}\)/);
    assert.match(onboardingPage, /<input id="name" name="name" required maxLength=\{80\} placeholder="The Garcia House" \/>/);
    assert.match(accountPage, /<input id="household_name" name="household_name" required maxLength=\{80\} defaultValue=\{context\.household\.name\} \/>/);
  });
});
