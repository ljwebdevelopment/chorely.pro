import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("billing route safety", () => {
  it("does not redirect raw Stripe or database exception text to account billing", () => {
    const checkoutRoute = readFileSync("src/app/api/stripe/checkout/route.ts", "utf8");
    const portalRoute = readFileSync("src/app/api/stripe/portal/route.ts", "utf8");
    const webhookRoute = readFileSync("src/app/api/stripe/webhook/route.ts", "utf8");
    const billingPage = readFileSync("src/app/account/billing/page.tsx", "utf8");

    assert.doesNotMatch(checkoutRoute, /error instanceof Error \? error\.message/);
    assert.doesNotMatch(checkoutRoute, /error\.message \|\| stripePersistenceFailureMessage/);
    assert.doesNotMatch(portalRoute, /error instanceof Error \? error\.message/);
    assert.doesNotMatch(webhookRoute, /error instanceof Error \? error\.message/);
    assert.doesNotMatch(webhookRoute, /\.message \|\|/);
    assert.doesNotMatch(webhookRoute, /Missing environment variables/);
    assert.match(checkoutRoute, /isSubscriptionActive\(context\.subscription\?\.status\)/);
    assert.match(checkoutRoute, /stripeCheckoutBlockedMessage\(\)/);
    assert.match(webhookRoute, /stripeConfigurationFailureMessage\(\{ target: "webhook" \}\)/);
    assert.match(billingPage, /billingErrorMessage\(params\.error\)/);
  });

  it("preserves the intended app destination through subscription checkout and portal returns", () => {
    const proxy = readFileSync("src/proxy.ts", "utf8");
    const authContext = readFileSync("src/lib/auth-context.ts", "utf8");
    const billingPage = readFileSync("src/app/account/billing/page.tsx", "utf8");
    const checkoutRoute = readFileSync("src/app/api/stripe/checkout/route.ts", "utf8");
    const portalRoute = readFileSync("src/app/api/stripe/portal/route.ts", "utf8");

    assert.match(proxy, /requestHeaders\.set\("x-chorely-current-path", currentPath\)/);
    assert.match(authContext, /const currentPath = await currentRequestPath\(\)/);
    assert.match(authContext, /redirect\(`\/account\/billing\?required=subscription&next=\$\{encodeURIComponent\(currentPath\)\}`\)/);
    assert.match(billingPage, /const next = safeRedirectPath\(params\.next, "\/dashboard"\)/);
    assert.match(billingPage, /<input type="hidden" name="next" value=\{next\} \/>/);
    assert.match(billingPage, /<Link className="button" href=\{next\}>[\s\S]*?Continue to Chorely/);
    assert.match(checkoutRoute, /const formData = await request\.formData\(\)/);
    assert.match(checkoutRoute, /const next = safeRedirectPath\(String\(formData\.get\("next"\) \|\| ""\), "\/dashboard"\)/);
    assert.match(checkoutRoute, /success_url: `\$\{siteUrl\}\/account\/billing\?checkout=success&next=\$\{nextParam\}`/);
    assert.match(checkoutRoute, /cancel_url: `\$\{siteUrl\}\/account\/billing\?checkout=cancelled&next=\$\{nextParam\}`/);
    assert.match(portalRoute, /return_url: process\.env\.STRIPE_PORTAL_RETURN_URL \|\| `\$\{siteUrl\}\/account\/billing\?next=\$\{nextParam\}`/);
  });
});
