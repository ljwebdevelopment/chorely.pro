import { NextResponse } from "next/server";
import { getAppContext } from "@/lib/auth-context";
import { getEnv, getMissingServerEnv, getSiteUrl } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  stripeCheckoutBlockedMessage,
  stripeConfigurationFailureMessage,
  stripePersistenceFailureMessage,
  stripeSessionFailureMessage
} from "@/lib/stripe-domain";
import { isSubscriptionActive } from "@/lib/billing-domain";
import { safeRedirectPath } from "@/lib/redirect-domain";

export async function POST(request: Request) {
  const siteUrl = getSiteUrl();
  const formData = await request.formData();
  const next = safeRedirectPath(String(formData.get("next") || ""), "/dashboard");
  const nextParam = encodeURIComponent(next);
  const context = await getAppContext();
  if (isSubscriptionActive(context.subscription?.status)) {
    return NextResponse.redirect(`${siteUrl}/account/billing?error=${encodeURIComponent(stripeCheckoutBlockedMessage())}&next=${nextParam}`, {
      status: 303
    });
  }

  const missing = getMissingServerEnv();
  if (missing.length) {
    return NextResponse.redirect(`${siteUrl}/account/billing?error=${encodeURIComponent(stripeConfigurationFailureMessage({ target: "checkout" }))}&next=${nextParam}`, {
      status: 303
    });
  }

  const stripe = getStripe();
  const admin = createSupabaseAdminClient();

  let customerId = context.subscription?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: context.user.email,
      metadata: { user_id: context.user.id }
    });
    customerId = customer.id;
    const { error } = await admin.from("subscriptions").upsert({ user_id: context.user.id, stripe_customer_id: customerId, status: "none" });
    if (error) {
      return NextResponse.redirect(
        `${siteUrl}/account/billing?error=${encodeURIComponent(stripePersistenceFailureMessage({ target: "checkout" }))}&next=${nextParam}`,
        { status: 303 }
      );
    }
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: getEnv("STRIPE_PRICE_ID"), quantity: 1 }],
      success_url: `${siteUrl}/account/billing?checkout=success&next=${nextParam}`,
      cancel_url: `${siteUrl}/account/billing?checkout=cancelled&next=${nextParam}`,
      allow_promotion_codes: true,
      metadata: { user_id: context.user.id },
      subscription_data: {
        metadata: { user_id: context.user.id }
      }
    });
  } catch {
    return NextResponse.redirect(
      `${siteUrl}/account/billing?error=${encodeURIComponent(stripeSessionFailureMessage({ target: "checkout" }))}&next=${nextParam}`,
      { status: 303 }
    );
  }

  return NextResponse.redirect(session.url!, { status: 303 });
}
