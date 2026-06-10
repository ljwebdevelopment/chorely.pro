import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { getMissingPortalEnv, getMissingServerEnv, getMissingWebhookEnv } from "../src/lib/env";

const managedKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET"
] as const;

const originalEnv = new Map(managedKeys.map((key) => [key, process.env[key]]));

function resetManagedEnv() {
  for (const key of managedKeys) {
    const value = originalEnv.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function clearManagedEnv() {
  for (const key of managedKeys) {
    delete process.env[key];
  }
}

afterEach(resetManagedEnv);

describe("billing environment checks", () => {
  it("documents every deployment environment variable used by the app", () => {
    const envExample = readFileSync(".env.example", "utf8");
    const documentedKeys = new Set(
      envExample
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => line.split("=")[0])
    );

    assert.deepEqual(
      [...documentedKeys].sort(),
      [
        "NEXT_PUBLIC_SITE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_URL",
        "STRIPE_PORTAL_RETURN_URL",
        "STRIPE_PRICE_ID",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "SUPABASE_SERVICE_ROLE_KEY"
      ].sort()
    );
  });

  it("keeps checkout strict because it creates customers and subscriptions", () => {
    clearManagedEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.STRIPE_SECRET_KEY = "sk_test";

    assert.deepEqual(getMissingServerEnv(), ["SUPABASE_SERVICE_ROLE_KEY", "STRIPE_PRICE_ID"]);
  });

  it("allows the Stripe portal without checkout price or service-role credentials", () => {
    clearManagedEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.STRIPE_SECRET_KEY = "sk_test";

    assert.deepEqual(getMissingPortalEnv(), []);
  });

  it("checks webhook-specific signing and persistence credentials", () => {
    clearManagedEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    process.env.STRIPE_SECRET_KEY = "sk_test";

    assert.deepEqual(getMissingWebhookEnv(), ["STRIPE_WEBHOOK_SECRET"]);
  });
});
