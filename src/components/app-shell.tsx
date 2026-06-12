import { redirect } from "next/navigation";
import { Bell, BookOpen, ChartNoAxesColumn, CheckSquare, CreditCard, Home, Settings, UserRound, Users } from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { ActiveLink } from "@/components/active-link";
import { NotificationBridge } from "@/components/notification-bridge";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveProfile } from "@/lib/profile-session";
import { signOutAction, switchProfileAction } from "@/lib/actions";
import { TEST_MODE } from "@/lib/test-mode";

async function TestModeBanner({ userId }: { userId: string }) {
  if (!TEST_MODE) return null;
  const supabase = await createSupabaseServerClient();
  const { data: volunteer } = await supabase
    .from("volunteer_testers")
    .select("name,founding_tester")
    .eq("auth_user_id", userId)
    .maybeSingle();
  return (
    <div className="test-mode-banner">
      Test mode{volunteer ? ` — ${volunteer.name}${volunteer.founding_tester ? " (Founding Tester)" : ""}` : ""} — volunteer testing in progress.
    </div>
  );
}

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
  const profile = await getActiveProfile();
  if (!profile) redirect("/profiles");
  const supabase = await createSupabaseServerClient();

  if (profile.type === "child") {
    const { data: child } = await supabase
      .from("children")
      .select("id,name")
      .eq("id", profile.childId)
      .eq("household_id", context.household?.id || "")
      .is("archived_at", null)
      .maybeSingle();
    if (!child) redirect("/profiles");

    return (
      <div className="app-shell">
        <TestModeBanner userId={context.user.id} />
        <aside className="sidebar kid-sidebar">
          <BrandLogo />
          <p className="meta" style={{ marginTop: 12 }}>
            Hi {child.name}! — {context.household?.name || "Household"}
          </p>
          <nav aria-label="Kid navigation">
            <ActiveLink href="/child">
              <CheckSquare size={18} aria-hidden="true" />
              My Chores
            </ActiveLink>
          </nav>
          <form action={switchProfileAction} style={{ marginTop: 24 }}>
            <button className="secondary-button" type="submit">
              <UserRound size={16} aria-hidden="true" /> Switch profile
            </button>
          </form>
        </aside>
        <main className="app-main">{children}</main>
      </div>
    );
  }

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.user.id)
    .is("read_at", null);

  return (
    <div className="app-shell">
      <TestModeBanner userId={context.user.id} />
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
        <div className="sidebar-actions">
          <form action={switchProfileAction}>
            <button className="secondary-button" type="submit">
              <UserRound size={16} aria-hidden="true" /> Switch profile
            </button>
          </form>
          <form action={signOutAction}>
            <button className="ghost-button" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="app-main">{children}</main>
      <NotificationBridge />
    </div>
  );
}
