import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

// Profile and Security live inside the app sidebar so Account doesn't feel
// like leaving the app. Billing keeps its own standalone layout because it
// must stay reachable without an active subscription or selected profile.
export default function AccountShellLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
