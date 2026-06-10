import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("page error surfaces", () => {
  it("does not expose raw database messages from page data guards", () => {
    const pageData = readFileSync("src/lib/page-data.ts", "utf8");
    const authContext = readFileSync("src/lib/auth-context.ts", "utf8");
    const onboardingPage = readFileSync("src/app/onboarding/page.tsx", "utf8");
    const childDetailPage = readFileSync("src/app/(app)/children/[id]/page.tsx", "utf8");
    const choreEditPage = readFileSync("src/app/(app)/chores/[id]/edit/page.tsx", "utf8");
    const rootError = readFileSync("src/app/error.tsx", "utf8");
    const appError = readFileSync("src/app/(app)/error.tsx", "utf8");
    const accountError = readFileSync("src/app/account/error.tsx", "utf8");
    const combined = [pageData, authContext, onboardingPage, childDetailPage, choreEditPage, rootError, appError, accountError].join("\n");

    assert.doesNotMatch(combined, /throw new Error\([^)]*\.message/);
    assert.doesNotMatch(combined, /error\.message/);
    assert.doesNotMatch(combined, /\?\.message \|\|/);
    assert.match(pageData, /throw new Error\(`\$\{input\.label\} could not be loaded\.`\)/);
  });
});
