import Link from "next/link";
import { BrandLogo } from "@/components/brand";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="section">
      <div className="container">
        <Link href="/dashboard">
          <BrandLogo />
        </Link>
        <div className="stack" style={{ marginTop: 28 }}>
          {children}
        </div>
      </div>
    </main>
  );
}
