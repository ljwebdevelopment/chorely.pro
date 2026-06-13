import type { Metadata } from "next";
import Link from "next/link";
import { Lock, RefreshCcw, Smartphone } from "lucide-react";
import { TEST_MODE } from "@/lib/test-mode";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Chorely is $6/month for the whole household — unlimited kids, unlimited chores, and the full allowance ledger."
};

const included = [
  "Unlimited children with their own profiles and PINs",
  "Unlimited chores — daily, weekly, monthly, or custom schedules",
  "Dollar rewards on every chore, with shared chores and split payments",
  "Parent approval queue with redo and reject options",
  "Allowance balances, payout tracking, and weekly reports",
  "Sprout, the chore buddy that keeps kids motivated",
  "Install on iPhone and Android home screens",
  "In-app notifications for completions and reminders"
];

export default function PricingPage() {
  return (
    <main className="section">
      <div className="container">
        <div className="two-column">
          <div>
            <p className="eyebrow">Pricing</p>
            <h1>One simple plan for the whole family.</h1>
            <p className="lead">
              Chorely is $6 a month — that&apos;s it. One subscription covers every parent, every kid, and every chore in
              your household. No tiers to compare, no per-child fees, and no ads anywhere near your family.
            </p>
            <div className="stack" style={{ marginTop: 24 }}>
              <article className="card">
                <Lock color="#7FA66A" aria-hidden="true" />
                <h3>Secure checkout by Stripe</h3>
                <p>
                  Payments are handled by Stripe, the same payment platform trusted by millions of businesses. Chorely
                  never sees or stores your card details.
                </p>
              </article>
              <article className="card">
                <RefreshCcw color="#7FA66A" aria-hidden="true" />
                <h3>Cancel anytime</h3>
                <p>
                  Manage or cancel your subscription yourself from the billing page — no emails, no phone calls. If you
                  cancel, you keep access until the end of the period you paid for.
                </p>
              </article>
              <article className="card">
                <Smartphone color="#7FA66A" aria-hidden="true" />
                <h3>Works on every device</h3>
                <p>
                  Chorely runs in any browser and installs to iPhone and Android home screens like a regular app. One
                  subscription covers all of them.
                </p>
              </article>
            </div>
          </div>
          <div>
            <article className="price-card">
              <p className="eyebrow">Chorely</p>
              <div className="price-amount">
                <strong>$6</strong>
                <span>per month, per family</span>
              </div>
              <p className="muted">Everything included. Nothing extra to buy.</p>
              <ul className="check-list">
                {included.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {!TEST_MODE ? (
                <Link className="button" href="/sign-up">
                  Start for $6/month
                </Link>
              ) : null}
              <p className="meta" style={{ marginTop: 12 }}>
                Create your account, subscribe securely through Stripe, and you&apos;ll be walked through setup step by
                step.
              </p>
            </article>
          </div>
        </div>
        <div className="stack" style={{ marginTop: 40 }}>
          <article className="card">
            <h3>How does billing work?</h3>
            <p>
              After you create your account, you&apos;ll be taken to a secure Stripe checkout to start your $6/month
              subscription. Your card is charged monthly, and invoices, receipts, and payment methods are always available
              in the billing portal.
            </p>
          </article>
          <article className="card">
            <h3>Does the price change as my family grows?</h3>
            <p>No. Whether you have one child or six, the price stays $6/month for the entire household.</p>
          </article>
          <article className="card">
            <h3>Does Chorely move real money?</h3>
            <p>
              No — and that&apos;s by design. Chorely tracks what your kids have earned, and you pay them however your
              family already does: cash, a savings jar, or a transfer. The ledger keeps everyone honest.
            </p>
          </article>
        </div>
      </div>
    </main>
  );
}
