import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to the questions parents ask before starting Chorely."
};

const faqs = [
  [
    "Do my kids need their own email accounts?",
    "No. You own the family account, and each child gets a profile inside it with their own 4-digit PIN. Kids use the Kids' Chore View to mark work complete — no email, no password, nothing to manage."
  ],
  [
    "When does my child actually get money?",
    "Chorely tracks earnings; you pay them out however your family already does — cash, a savings jar, or a transfer. A chore only adds to a child's balance after you approve it, and you record payouts so the balance always shows what's still owed."
  ],
  [
    "Can two kids share one chore?",
    "Yes. A shared chore can be completed by any assigned child, or require every assigned child to finish it. You can also enable split payments, so kids who do a chore together share the reward."
  ],
  [
    "What happens if a chore isn't done well?",
    "You decide. From the approval queue you can approve it, reject it, or request a redo — and leave a note explaining why. No money moves until you approve."
  ],
  [
    "Does Chorely install on phones?",
    "Yes. Chorely adds to iPhone and Android home screens like a regular app — the setup guide walks you through it step by step, and it takes about 30 seconds per phone."
  ],
  [
    "What is Sprout?",
    "Sprout is the family chore buddy: a small plant on the home screen that grows as the week's chores get approved and gets thirsty when chores are skipped. It gives younger kids a reason to check their list without turning chores into a video game."
  ],
  [
    "How much does it cost, and can I cancel?",
    "Chorely is $6/month for the entire household — unlimited kids and chores. Billing runs through Stripe, and you can cancel anytime from the billing page; you keep access through the period you've paid for."
  ]
];

export default function FaqPage() {
  return (
    <main className="section">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">FAQ</p>
          <h1>Questions parents ask before starting.</h1>
        </div>
        <div className="stack">
          {faqs.map(([question, answer]) => (
            <article className="card" key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </article>
          ))}
          <article className="card">
            <h3>Something else on your mind?</h3>
            <p>
              We&apos;re happy to help — reach us anytime at <Link href="/contact">support@chorely.pro</Link>.
            </p>
          </article>
        </div>
      </div>
    </main>
  );
}
