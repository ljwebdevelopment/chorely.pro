import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import { getAppContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

// Billing intentionally stays outside the app sidebar shell: it is the
// destination of the subscription-required redirect, so it must render
// without an active subscription or a selected profile.
export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  await getAppContext();

  return (
    <>
      <header className="site-header">
        <div className="container nav">
          <Link href="/dashboard">
            <BrandLogo />
          </Link>
          <nav className="nav-links" aria-label="Billing navigation">
            <Link href="/account">Account</Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
        </div>
      </header>
      <main className="section">
        <div className="container">{children}</div>
      </main>
    </>
  );
}
