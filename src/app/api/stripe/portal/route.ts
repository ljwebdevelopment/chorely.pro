import { NextResponse } from "next/server";
import { getAppContext } from "@/lib/auth-context";
import { getMissingPortalEnv, getSiteUrl } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { stripeConfigurationFailureMessage, stripeSessionFailureMessage } from "@/lib/stripe-domain";
import { safeRedirectPath } from "@/lib/redirect-domain";

export async function POST(request: Request) {
  const siteUrl = getSiteUrl();
  const formData = await request.formData();
  const next = safeRedirectPath(String(formData.get("next") || ""), "/dashboard");
  const nextParam = encodeURIComponent(next);
  const context = await getAppContext();
  const missing = getMissingPortalEnv();
  if (missing.length) {
    return NextResponse.redirect(`${siteUrl}/account/billing?error=${encodeURIComponent(stripeConfigurationFailureMessage({ target: "portal" }))}&next=${nextParam}`, {
      status: 303
    });
  }

  const customer = context.subscription?.stripe_customer_id;

  if (!customer) {
    return NextResponse.redirect(`${siteUrl}/account/billing?error=${encodeURIComponent("no-customer")}&next=${nextParam}`, { status: 303 });
  }

  let session;
  try {
    session = await getStripe().billingPortal.sessions.create({
      customer,
      return_url: process.env.STRIPE_PORTAL_RETURN_URL || `${siteUrl}/account/billing?next=${nextParam}`
    });
  } catch {
    return NextResponse.redirect(
      `${siteUrl}/account/billing?error=${encodeURIComponent(stripeSessionFailureMessage({ target: "portal" }))}&next=${nextParam}`,
      { status: 303 }
    );
  }

  return NextResponse.redirect(session.url, { status: 303 });
}
