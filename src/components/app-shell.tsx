import { redirect } from "next/navigation";
import { Bell, BookOpen, ChartNoAxesColumn, CheckSquare, CreditCard, Home, Settings, Users } from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { ActiveLink } from "@/components/active-link";
import { NotificationBridge } from "@/components/notification-bridge";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/actions";

const links = [
  { href: "/dashboard", label: "Home Board", icon: Home },
  { href: "/children", label: "Family Members", icon: Users },
  { href: "/chores", label: "Chores", icon: CheckSquare },
  { href: "/approvals", label: "Approvals", icon: Bell },
  { href: "/earnings", label: "Allowance", icon: CreditCard },
  { href: "/reports", label: "Reports", icon: ChartNoAxesColumn },
  { href: "/notifications", label: "Household Notes", icon: BookOpen },
  { href: "/account", label: "Account", icon: Settings }
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const context = await getAppContext({ requireSubscription: true });
  if (!context.onboardingComplete) redirect("/onboarding");
  const supabase = await createSupabaseServerClient();
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.user.id)
    .is("read_at", null);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <ActiveLink href="/dashboard" exact aria-label="Chorely dashboard">
          <BrandLogo />
        </ActiveLink>
        <p className="meta" style={{ marginTop: 12 }}>
          {context.household?.name || "Household"}
        </p>
        <nav aria-label="App navigation">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <ActiveLink href={link.href} key={link.href}>
                <Icon size={18} aria-hidden="true" />
                {link.label}
                {link.href === "/notifications" && unreadCount ? (
                  <span className="nav-badge" aria-label={`${unreadCount} unread`}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </ActiveLink>
            );
          })}
          <ActiveLink href="/child">Kids&apos; Chore View</ActiveLink>
        </nav>
        <form action={signOutAction} style={{ marginTop: 24 }}>
          <button className="secondary-button" type="submit">
            Sign out
          </button>
        </form>
      </aside>
      <main className="app-main">{children}</main>
      <NotificationBridge />
    </div>
  );
}
