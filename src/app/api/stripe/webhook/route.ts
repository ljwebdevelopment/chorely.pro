import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getEnv, getMissingWebhookEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  stripeConfigurationFailureMessage,
  stripePersistenceFailureMessage,
  subscriptionRowFromCheckout,
  subscriptionRowFromStripe
} from "@/lib/stripe-domain";
import { subscriptionNotificationForStatus, subscriptionNotificationPersistenceFailureMessage } from "@/lib/notification-domain";

async function createSubscriptionNotification(input: { userId: string; status: string; cancelAtPeriodEnd: boolean }) {
  const notice = subscriptionNotificationForStatus(input.status, input.cancelAtPeriodEnd);
  if (!notice) return;

  const admin = createSupabaseAdminClient();
  const [{ data: household, error: householdError }, { data: existing, error: existingError }] = await Promise.all([
    admin.from("households").select("id").eq("owner_id", input.userId).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    admin
      .from("notifications")
      .select("id")
      .eq("user_id", input.userId)
      .eq("type", notice.type)
      .is("read_at", null)
      .limit(1)
      .maybeSingle()
  ]);

  if (householdError || existingError) {
    throw new Error(subscriptionNotificationPersistenceFailureMessage());
  }

  if (existing) return;

  const { error: insertError } = await admin.from("notifications").insert({
    household_id: household?.id || null,
    user_id: input.userId,
    type: notice.type,
    title: notice.title,
    body: notice.body
  });
  if (insertError) {
    throw new Error(subscriptionNotificationPersistenceFailureMessage());
  }
}

async function upsertSubscription(subscription: Stripe.Subscription) {
  const subscriptionWithPeriod = subscription as Stripe.Subscription & { current_period_end?: number };
  const admin = createSupabaseAdminClient();
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const userId = subscription.metadata.user_id;
  const priceId = subscription.items.data[0]?.price.id || null;

  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const { data } = await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
    resolvedUserId = data?.user_id;
  }

  if (!resolvedUserId) return;

  const { error } = await admin.from("subscriptions").upsert({
    ...subscriptionRowFromStripe({
      userId: resolvedUserId,
      customerId,
      subscriptionId: subscription.id,
      status: subscription.status,
      priceId,
      currentPeriodEndSeconds: subscriptionWithPeriod.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    })
  });
  if (error) {
    throw new Error(stripePersistenceFailureMessage({ target: "webhook" }));
  }

  await createSubscriptionNotification({
    userId: resolvedUserId,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!userId || !customerId) return;

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("subscriptions")
    .select("status,stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await admin.from("subscriptions").upsert(
    subscriptionRowFromCheckout({
      userId,
      customerId,
      subscriptionId,
      existingStatus: existing?.status,
      existingSubscriptionId: existing?.stripe_subscription_id
    })
  );
  if (error) {
    throw new Error(stripePersistenceFailureMessage({ target: "webhook" }));
  }
}

export async function POST(request: Request) {
  const missing = getMissingWebhookEnv();
  if (missing.length) {
    return NextResponse.json({ error: stripeConfigurationFailureMessage({ target: "webhook" }) }, { status: 503 });
  }

  const stripe = getStripe();
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, getEnv("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await upsertSubscription(event.data.object as Stripe.Subscription);
    }

    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }
  } catch {
    return NextResponse.json({ error: stripePersistenceFailureMessage({ target: "webhook" }) }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
