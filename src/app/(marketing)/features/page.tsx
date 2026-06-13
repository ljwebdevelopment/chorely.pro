import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CalendarCheck, ChartNoAxesColumn, HandCoins, Smartphone, Sprout, Users, Wallet } from "lucide-react";
import { PUBLIC_SIGN_UP_HREF } from "@/lib/test-mode";

export const metadata: Metadata = {
  title: "Features",
  description: "Everything Chorely does for your family: chore schedules, parent approvals, allowance tracking, payouts, and kid motivation."
};

const features = [
  {
    icon: Users,
    title: "One account for the whole family",
    body: "Parents own the account; kids get their own profiles with PINs. No kid email addresses, no separate logins to manage, nothing social."
  },
  {
    icon: CalendarCheck,
    title: "Chores on autopilot",
    body: "Daily, weekly, monthly, or custom schedules. Each chore shows up on the right day with the right kid's name on it — no more re-writing the chart."
  },
  {
    icon: HandCoins,
    title: "A price on every chore",
    body: "Set what each chore pays. Share a chore between siblings, require everyone to pitch in, or split one payment across the kids who did the work together."
  },
  {
    icon: Bell,
    title: "Parent approval on every payout",
    body: "Kids submit finished chores; you approve, reject, or ask for a redo. Money is only earned when you say the job is done right."
  },
  {
    icon: Wallet,
    title: "An honest allowance ledger",
    body: "Approved chores build each child's balance. Record payouts when you hand over real money, and the ledger always shows what's still owed."
  },
  {
    icon: ChartNoAxesColumn,
    title: "Reports parents actually read",
    body: "Weekly summaries of what was submitted, approved, and earned — per child and for the whole household."
  },
  {
    icon: Sprout,
    title: "Sprout, the chore buddy",
    body: "A little plant on the home screen that grows as the week's chores get approved and gets thirsty when they don't. Gentle motivation, no nagging."
  },
  {
    icon: Smartphone,
    title: "Installs like a real app",
    body: "Add Chorely to iPhone and Android home screens in under a minute. In-app and browser notifications keep everyone in the loop."
  }
];

export default function FeaturesPage() {
  return (
    <main className="section">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Features</p>
          <h1>Everything a family needs to make chores stick.</h1>
          <p className="lead">Chorely keeps the system simple: kids do the work, parents approve it, and the money adds up.</p>
        </div>
        <div className="benefit-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className="card" key={feature.title}>
                <Icon color="#7FA66A" aria-hidden="true" />
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            );
          })}
        </div>
        <div className="cta-banner" style={{ marginTop: 40 }}>
          <h2>See it with your own kids</h2>
          <p>Set up your household in about five minutes, for $6 a month.</p>
          <Link className="button" href={PUBLIC_SIGN_UP_HREF}>
            Get started
          </Link>
        </div>
      </div>
    </main>
  );
}
