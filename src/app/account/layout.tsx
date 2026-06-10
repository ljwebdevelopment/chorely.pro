import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import { ActiveLink } from "@/components/active-link";
import { getAppContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await getAppContext();

  return (
    <>
      <header className="site-header">
        <div className="container nav">
          <Link href="/dashboard">
            <BrandLogo />
          </Link>
          <nav className="nav-links" aria-label="Account navigation">
            <ActiveLink href="/account" exact>Profile</ActiveLink>
            <ActiveLink href="/account/security">Security</ActiveLink>
            <ActiveLink href="/account/billing">Billing</ActiveLink>
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
