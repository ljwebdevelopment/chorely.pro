import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import { TEST_MODE } from "@/lib/test-mode";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="container nav">
          <Link href="/" aria-label="Chorely home">
            <BrandLogo />
          </Link>
          <nav className="nav-links" aria-label="Main navigation">
            <Link href="/features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <div className="actions">
            <Link className="ghost-button" href="/sign-in">
              Sign in
            </Link>
            {!TEST_MODE ? (
              <Link className="button" href="/sign-up">
                Get started
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      {children}
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <BrandLogo withTagline />
            <p className="footer-note">
              Chorely helps families turn everyday chores into earned allowance and growing responsibility. Made for
              parents, loved by kids.
            </p>
          </div>
          <nav className="nav-links" aria-label="Footer navigation">
            <Link href="/features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
