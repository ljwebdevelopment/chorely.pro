import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SubscriptionStatus } from "@/lib/types";
import { isSubscriptionActive } from "@/lib/billing-domain";
import { requirePageData } from "@/lib/page-data";
import { safeRedirectPath } from "@/lib/redirect-domain";

export type AppContext = {
  user: {
    id: string;
    email?: string;
  };
  household: {
    id: string;
    name: string;
  } | null;
  subscription: {
    status: SubscriptionStatus;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  onboardingComplete: boolean;
};

async function currentRequestPath(fallback = "/dashboard") {
  return safeRedirectPath((await headers()).get("x-chorely-current-path"), fallback);
}

async function redirectToSignIn(): Promise<never> {
  const next = await currentRequestPath();
  redirect(`/sign-in?next=${encodeURIComponent(next)}`);
}

export async function getAppContext(options: { requireSubscription?: boolean; requireOnboarding?: boolean } = {}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    return await redirectToSignIn();
  }

  if (!user) {
    return await redirectToSignIn();
  }

  const [{ data: profile, error: profileError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    supabase.from("profiles").select("onboarding_complete").eq("id", user.id).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("status,stripe_customer_id,stripe_subscription_id,current_period_end,cancel_at_period_end")
      .eq("user_id", user.id)
      .maybeSingle()
  ]);
  const profileRow = requirePageData({ data: profile, error: profileError, label: "User profile" });
  if (subscriptionError) {
    throw new Error("Subscription status could not be loaded.");
  }

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (householdError) {
    throw new Error("Household could not be loaded.");
  }

  const status = (subscription?.status || "none") as SubscriptionStatus;
  const subscribed = isSubscriptionActive(status);
  const onboardingComplete = Boolean(profileRow.onboarding_complete);

  if (options.requireSubscription && !subscribed) {
    const currentPath = await currentRequestPath();
    redirect(`/account/billing?required=subscription&next=${encodeURIComponent(currentPath)}`);
  }

  if (options.requireOnboarding && !onboardingComplete) {
    redirect("/onboarding");
  }

  return {
    user: { id: user.id, email: user.email || undefined },
    household: household || null,
    subscription: subscription
      ? {
          status,
          stripe_customer_id: subscription.stripe_customer_id,
          stripe_subscription_id: subscription.stripe_subscription_id,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: Boolean(subscription.cancel_at_period_end)
        }
      : null,
    onboardingComplete
  } satisfies AppContext;
}
