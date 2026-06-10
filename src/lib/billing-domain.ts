import type { SubscriptionStatus } from "@/lib/types";

const activeStatuses: SubscriptionStatus[] = ["active", "trialing"];

export function isSubscriptionActive(status: SubscriptionStatus | string | null | undefined) {
  return activeStatuses.includes((status || "none") as SubscriptionStatus);
}

export function canOpenBillingPortal(stripeCustomerId: string | null | undefined) {
  return Boolean(stripeCustomerId);
}

export function shouldShowCheckout(status: SubscriptionStatus | string | null | undefined) {
  return !isSubscriptionActive(status);
}

export function subscriptionStatusLabel(status: SubscriptionStatus | string | null | undefined, cancelAtPeriodEnd = false) {
  const normalized = status || "none";
  if (normalized === "active" && cancelAtPeriodEnd) return "Active, cancels at period end";
  if (normalized === "trialing" && cancelAtPeriodEnd) return "Trialing, cancels at period end";

  const labels: Record<string, string> = {
    active: "Active",
    trialing: "Trialing",
    past_due: "Past due",
    canceled: "Canceled",
    incomplete: "Payment incomplete",
    incomplete_expired: "Payment expired",
    unpaid: "Unpaid",
    none: "Not subscribed"
  };

  return labels[normalized] || normalized;
}

export function billingErrorMessage(value: string | null | undefined) {
  if (!value) return null;

  const messages: Record<string, string> = {
    "no-customer": "Start checkout before opening the billing portal.",
    "Checkout is not configured for this deployment yet.": "Checkout is not configured for this deployment yet.",
    "The Stripe billing portal is not configured for this deployment yet.": "The Stripe billing portal is not configured for this deployment yet.",
    "Unable to prepare checkout right now. Please try again.": "Unable to prepare checkout right now. Please try again.",
    "Unable to start Stripe checkout right now. Please try again.": "Unable to start Stripe checkout right now. Please try again.",
    "Unable to open the Stripe billing portal right now.": "Unable to open the Stripe billing portal right now.",
    "You already have an active Chorely subscription.": "You already have an active Chorely subscription."
  };

  return messages[value] || "Billing action could not be completed right now. Please try again.";
}
