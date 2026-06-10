export type SubscriptionRowUpdate = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: string;
  price_id?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  updated_at: string;
};

const provisionalCheckoutStatuses = new Set(["none", "incomplete"]);

export function statusFromCheckoutCompletion(input: {
  subscriptionId?: string | null;
  existingStatus?: string | null;
  existingSubscriptionId?: string | null;
}) {
  if (!input.subscriptionId) return "none";

  const existingStatus = input.existingStatus || "none";
  const sameSubscription = input.existingSubscriptionId === input.subscriptionId;

  if (sameSubscription && !provisionalCheckoutStatuses.has(existingStatus)) {
    return existingStatus;
  }

  return "incomplete";
}

export function subscriptionRowFromStripe(input: {
  userId: string;
  customerId: string;
  subscriptionId: string;
  status: string;
  priceId?: string | null;
  currentPeriodEndSeconds?: number | null;
  cancelAtPeriodEnd: boolean;
  updatedAt?: Date;
}): SubscriptionRowUpdate {
  return {
    user_id: input.userId,
    stripe_customer_id: input.customerId,
    stripe_subscription_id: input.subscriptionId,
    status: input.status,
    price_id: input.priceId || null,
    current_period_end: input.currentPeriodEndSeconds
      ? new Date(input.currentPeriodEndSeconds * 1000).toISOString()
      : null,
    cancel_at_period_end: input.cancelAtPeriodEnd,
    updated_at: (input.updatedAt || new Date()).toISOString()
  };
}

export function subscriptionRowFromCheckout(input: {
  userId: string;
  customerId: string;
  subscriptionId?: string | null;
  existingStatus?: string | null;
  existingSubscriptionId?: string | null;
  updatedAt?: Date;
}): SubscriptionRowUpdate {
  return {
    user_id: input.userId,
    stripe_customer_id: input.customerId,
    stripe_subscription_id: input.subscriptionId || null,
    status: statusFromCheckoutCompletion({
      subscriptionId: input.subscriptionId,
      existingStatus: input.existingStatus,
      existingSubscriptionId: input.existingSubscriptionId
    }),
    updated_at: (input.updatedAt || new Date()).toISOString()
  };
}

export function stripePersistenceFailureMessage(input: { target: "checkout" | "webhook" }) {
  return input.target === "checkout"
    ? "Unable to prepare checkout right now. Please try again."
    : "Unable to persist Stripe subscription event.";
}

export function stripeSessionFailureMessage(input: { target: "checkout" | "portal" }) {
  return input.target === "checkout"
    ? "Unable to start Stripe checkout right now. Please try again."
    : "Unable to open the Stripe billing portal right now.";
}

export function stripeCheckoutBlockedMessage() {
  return "You already have an active Chorely subscription.";
}

export function stripeConfigurationFailureMessage(input: { target: "checkout" | "portal" | "webhook" }) {
  if (input.target === "checkout") return "Checkout is not configured for this deployment yet.";
  if (input.target === "portal") return "The Stripe billing portal is not configured for this deployment yet.";
  return "Stripe webhooks are not configured for this deployment yet.";
}
