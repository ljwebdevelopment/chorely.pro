import type { Metadata } from "next";
import { LifeBuoy, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Chorely team for support, billing, or account help."
};

export default function ContactPage() {
  return (
    <main className="section">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Contact</p>
          <h1>We&apos;re here to help.</h1>
          <p className="lead">
            Questions about setup, billing, or your family account? Send us an email and a real person will get back to
            you.
          </p>
        </div>
        <div className="grid">
          <article className="card">
            <Mail color="#7FA66A" aria-hidden="true" />
            <h3>Email support</h3>
            <p>
              Write to <a href="mailto:support@chorely.pro"><strong>support@chorely.pro</strong></a> for anything —
              setup help, billing questions, or feedback. We read every message.
            </p>
          </article>
          <article className="card">
            <LifeBuoy color="#7FA66A" aria-hidden="true" />
            <h3>Billing and subscriptions</h3>
            <p>
              You can manage your subscription, payment method, and invoices yourself anytime from the billing page
              inside your account — no need to email first.
            </p>
          </article>
        </div>
      </div>
    </main>
  );
}
