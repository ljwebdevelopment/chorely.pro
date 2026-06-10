const requiredServerKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_ID"
] as const;

const requiredPortalKeys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "STRIPE_SECRET_KEY"] as const;

const requiredWebhookKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET"
] as const;

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export function getEnv(
  name: (typeof requiredServerKeys)[number] | (typeof requiredWebhookKeys)[number] | "STRIPE_PORTAL_RETURN_URL"
) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getMissingServerEnv() {
  return requiredServerKeys.filter((key) => !process.env[key]);
}

export function getMissingPortalEnv() {
  return requiredPortalKeys.filter((key) => !process.env[key]);
}

export function getMissingWebhookEnv() {
  return requiredWebhookKeys.filter((key) => !process.env[key]);
}
