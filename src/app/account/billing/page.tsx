import Link from "next/link";
import { getAppContext } from "@/lib/auth-context";
import { billingErrorMessage, canOpenBillingPortal, isSubscriptionActive, shouldShowCheckout, subscriptionStatusLabel } from "@/lib/billing-domain";
import { safeRedirectPath } from "@/lib/redirect-domain";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ required?: string; error?: string; checkout?: string; next?: string }> }) {
  const params = await searchParams;
  const context = await getAppContext();
  const status = context.subscription?.status || "none";
  const showCheckout = shouldShowCheckout(status);
  const hasPortal = canOpenBillingPortal(context.subscription?.stripe_customer_id);
  const next = safeRedirectPath(params.next, "/dashboard");
  const subscribed = isSubscriptionActive(status);
  const statusLabel = subscriptionStatusLabel(status, context.subscription?.cancel_at_period_end);
  const errorMessage = billingErrorMessage(params.error);
  const periodDate = context.subscription?.current_period_end
    ? new Date(context.subscription.current_period_end).toLocaleDateString()
    : null;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Billing</p>
          <h1>Subscription settings</h1>
        </div>
      </div>
      {params.required ? <p className="notice">An active Chorely subscription is required to access the dashboard.</p> : null}
      {params.checkout === "success" ? <p className="notice">Checkout completed. Subscription status updates after Stripe confirms payment.</p> : null}
      {params.checkout === "cancelled" ? <p className="notice">Checkout was cancelled. You can subscribe when you are ready.</p> : null}
      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      <article className="card">
        <h2>Chorely</h2>
        <p className="lead">$6/month</p>
        <p className="muted">Status: {statusLabel}</p>
        {periodDate ? (
          <p className="muted">
            {context.subscription?.cancel_at_period_end ? "Access through" : "Renews through"} {periodDate}
          </p>
        ) : null}
        <div className="actions">
          {subscribed ? (
            <Link className="button" href={next}>
              Continue to Chorely
            </Link>
          ) : null}
          {showCheckout ? (
            <form action="/api/stripe/checkout" method="post">
              <input type="hidden" name="next" value={next} />
              <button className="button" type="submit">
                Subscribe for $6/month
              </button>
            </form>
          ) : null}
          {hasPortal ? (
            <form action="/api/stripe/portal" method="post">
              <input type="hidden" name="next" value={next} />
              <button className={showCheckout ? "secondary-button" : "button"} type="submit">
                Manage billing
              </button>
            </form>
          ) : null}
        </div>
      </article>
      <article className="card">
        <h2>Billing history</h2>
        <p className="muted">
          Invoices, receipts, payment methods, and cancellation controls are available through the secure Stripe billing portal.
        </p>
        {hasPortal ? (
          <form action="/api/stripe/portal" method="post">
            <input type="hidden" name="next" value={next} />
            <button className="secondary-button" type="submit">
              Open billing history
            </button>
          </form>
        ) : (
          <p className="muted">Billing history will appear after the first checkout session is created.</p>
        )}
      </article>
    </div>
  );
}
