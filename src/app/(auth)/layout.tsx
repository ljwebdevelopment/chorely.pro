import Link from "next/link";
import { BrandLogo } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <Link href="/">
          <BrandLogo />
        </Link>
        <div style={{ marginTop: 28 }}>{children}</div>
      </div>
    </main>
  );
}
