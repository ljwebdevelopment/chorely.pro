import Link from "next/link";
import { CalendarCheck, HandCoins, Heart, ShieldCheck, Sprout, Wallet } from "lucide-react";
import { BuddySprite } from "@/components/chore-buddy";
import { PUBLIC_SIGN_UP_HREF } from "@/lib/test-mode";

const previewRows = [
  ["Make your bed", "$1.00", "Approved"],
  ["Unload the dishwasher", "$2.50", "Pending review"],
  ["Rake the leaves together", "$6.00", "Split with sister"]
];

const parentBenefits = [
  {
    icon: CalendarCheck,
    title: "Chores that run themselves",
    body: "Set up daily and weekly chores once. Chorely keeps track of what's due, who it belongs to, and what's been done — no more chart on the fridge."
  },
  {
    icon: ShieldCheck,
    title: "You approve every payout",
    body: "Kids mark chores done, but money is only earned after you approve the work. Reject or request a redo when the job isn't finished."
  },
  {
    icon: Wallet,
    title: "Allowance without the math",
    body: "Every approved chore lands in a running balance per child. When you hand over real cash, record the payout and the ledger stays honest."
  },
  {
    icon: Heart,
    title: "Built for real families",
    body: "Kids share one family account with their own profiles and PINs — no kid emails, no social features, no ads. Just your household."
  }
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="hero-badge">
              <Sprout size={16} color="#7FA66A" aria-hidden="true" /> Building Responsibility, One Task at a Time
            </span>
            <h1>Chores get done. Kids earn real money.</h1>
            <p className="lead">
              Chorely turns your family&apos;s chores into earned allowance. Kids check off their work, you approve it, and
              they watch their money — and their responsibility — grow.
            </p>
            <div className="actions" style={{ marginTop: 26 }}>
              <Link className="button" href={PUBLIC_SIGN_UP_HREF}>
                Start your family for $6/month
              </Link>
              <Link className="secondary-button" href="/pricing">
                See what&apos;s included
              </Link>
            </div>
            <div className="trust-row">
              <span>No kid email accounts needed</span>
              <span>Cancel anytime</span>
              <span>Works on any phone</span>
            </div>
          </div>
          <div className="hero-panel dashboard-preview" aria-label="Chorely dashboard preview">
            {previewRows.map(([title, reward, status]) => (
              <div className="preview-row" key={title}>
                <div>
                  <strong>{title}</strong>
                  <p className="meta">{reward} reward</p>
                </div>
                <span className="status-pill">{status}</span>
              </div>
            ))}
            <div className="preview-row">
              <div>
                <strong>This week&apos;s allowance</strong>
                <p className="meta">2 kids, 11 chores approved</p>
              </div>
              <span className="balance-amount">$18.50</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2>From chore chart to allowance day in three steps</h2>
          </div>
          <div className="step-grid">
            <article className="step">
              <h3>Set up chores and rewards</h3>
              <p className="muted">
                Add your kids, then create chores with a dollar amount on each — daily, weekly, monthly, or your own custom
                schedule. Share a chore between siblings and even split the payment.
              </p>
            </article>
            <article className="step">
              <h3>Kids do the work</h3>
              <p className="muted">
                Kids open their own chore view, see exactly what&apos;s due today, and mark work complete with their personal
                PIN. Each finished chore also cares for Sprout, their chore buddy.
              </p>
            </article>
            <article className="step">
              <h3>You approve, they earn</h3>
              <p className="muted">
                Review completed chores from your dashboard. Approve the good work and the money lands in their balance —
                then record payouts when you hand over the cash.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container two-column">
          <div>
            <p className="eyebrow">For kids</p>
            <h2>Real money up front. A little encouragement on the side.</h2>
            <p className="lead">
              Earning is the heart of Chorely — kids see their balance grow with every approved chore. And to keep younger
              kids coming back, every household gets Sprout: a little plant that grows when chores get done and gets thirsty
              when they don&apos;t.
            </p>
            <ul className="check-list">
              <li>Kids see today&apos;s chores and what each one pays</li>
              <li>Approved work adds up in a balance they can watch grow</li>
              <li>Sprout grows from seed to full bloom as the week&apos;s chores get done</li>
              <li>Gentle reminders, not nagging — parents can send a friendly nudge</li>
            </ul>
            <Link className="button" href={PUBLIC_SIGN_UP_HREF}>
              Get started
            </Link>
          </div>
          <div className="hero-panel buddy-card" aria-label="Sprout the chore buddy preview">
            <BuddySprite stage={3} watered size={120} />
            <div>
              <h3>Sprout is blooming</h3>
              <p className="muted">6 chores approved this week. One more chore today keeps Sprout watered.</p>
              <p className="meta">Sprout lives on the family home screen</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">For parents</p>
            <h2>Less reminding. More follow-through.</h2>
          </div>
          <div className="benefit-grid">
            {parentBenefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article className="card" key={benefit.title}>
                  <Icon color="#7FA66A" aria-hidden="true" />
                  <h3>{benefit.title}</h3>
                  <p>{benefit.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container two-column">
          <div>
            <p className="eyebrow">Simple pricing</p>
            <h2>One plan. The whole household.</h2>
            <p className="lead">
              Everything Chorely does for one flat price — unlimited kids, unlimited chores, and the full allowance ledger.
              No tiers, no add-ons, no ads.
            </p>
            <Link className="secondary-button" href="/pricing">
              See pricing details
            </Link>
          </div>
          <article className="price-card">
            <p className="eyebrow">Chorely</p>
            <div className="price-amount">
              <strong>$6</strong>
              <span>per month, per family</span>
            </div>
            <ul className="check-list">
              <li>Unlimited children and chores</li>
              <li>Approval workflow and allowance ledger</li>
              <li>Payout tracking and weekly reports</li>
              <li>Installs on iPhone and Android home screens</li>
            </ul>
            <Link className="button" href={PUBLIC_SIGN_UP_HREF}>
              Start for $6/month
            </Link>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-banner">
            <h2>Ready for chores without the chasing?</h2>
            <p>
              Set up your household in about five minutes: add your kids, create your first chores, and put Chorely on
              everyone&apos;s home screen.
            </p>
            <Link className="button" href={PUBLIC_SIGN_UP_HREF}>
              <HandCoins size={18} aria-hidden="true" /> Start your family today
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
