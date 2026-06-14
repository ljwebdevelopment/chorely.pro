import Link from "next/link";
import { Bell, CheckCircle2, HandCoins, ListChecks, Plus, Users } from "lucide-react";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { centsToDollars } from "@/lib/money";
import { activeAssignedChildIds, isChoreDueOn, remainingCompletableChildIds } from "@/lib/chore-domain";
import { requirePageData } from "@/lib/page-data";
import { weeklyActivityStats } from "@/lib/report-domain";
import { ChoreCommentPanel, type LatestChoreComment } from "@/components/chore-comments";
import { BuddyCard } from "@/components/chore-buddy";
import { ChoreBell } from "@/components/chore-bell";
import { DashboardTour } from "@/components/dashboard-tour";
import { ActiveLink } from "@/components/active-link";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ comment?: string; error?: string; reminder?: string }> }) {
  const params = await searchParams;
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const supabase = await createSupabaseServerClient();
  const householdId = context.household!.id;
  const today = new Date();
  const dueOn = today.toISOString().slice(0, 10);

  const [
    { data: chores, error: choresError },
    { data: approvals, error: approvalsError },
    { data: ledger, error: ledgerError },
    { data: children, error: childrenError },
    { data: notifications, error: notificationsError },
    { data: completions, error: completionsError },
    { data: weeklyCompletions, error: weeklyCompletionsError },
    { data: comments, error: commentsError },
    { data: householdStyle },
    { data: profile }
  ] = await Promise.all([
    supabase
      .from("chores")
      .select("id,title,reward_cents,frequency,custom_schedule,created_at,chore_assignments(child_id)")
      .eq("household_id", householdId)
      .eq("active", true),
    supabase.from("chore_completions").select("id,chores(title),completed_at").eq("household_id", householdId).eq("status", "pending").limit(6),
    supabase.from("earnings_ledger").select("child_id,amount_cents").eq("household_id", householdId).eq("status", "approved"),
    supabase.from("children").select("id,name").eq("household_id", householdId).is("archived_at", null),
    supabase
      .from("notifications")
      .select("id,title,body,created_at,read_at")
      .eq("user_id", context.user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("chore_completions")
      .select("chore_id,status,participant_child_ids")
      .eq("household_id", householdId)
      .eq("due_on", dueOn)
      .in("status", ["collecting", "pending", "approved"]),
    supabase
      .from("chore_completions")
      .select("status,chore_id,completed_at,participant_child_ids,completed_by_child_id,chores(title)")
      .eq("household_id", householdId)
      .in("status", ["collecting", "pending", "approved", "rejected", "redo_requested"])
      .order("completed_at", { ascending: false }),
    supabase
      .from("chore_comments")
      .select("id,chore_id,kind,alert_label,note,read_at,created_at")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false }),
    // buddy_style ships in migration 004; tolerate its absence so the
    // dashboard never breaks on a database that has not run it yet.
    supabase.from("households").select("buddy_style").eq("id", householdId).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", context.user.id).maybeSingle()
  ]);
  const choreRows = requirePageData({ data: chores, error: choresError, label: "Dashboard chores" });
  const approvalRows = requirePageData({ data: approvals, error: approvalsError, label: "Pending approvals" });
  const ledgerRows = requirePageData({ data: ledger, error: ledgerError, label: "Earnings summary" });
  const childRows = requirePageData({ data: children, error: childrenError, label: "Household children" });
  const notificationRows = requirePageData({ data: notifications, error: notificationsError, label: "Recent activity" });
  const completionRows = requirePageData({ data: completions, error: completionsError, label: "Dashboard completions" });
  const weeklyCompletionRows = requirePageData({ data: weeklyCompletions, error: weeklyCompletionsError, label: "Weekly progress" });
  const commentRows = requirePageData({ data: comments, error: commentsError, label: "Dashboard household notes" });
  const buddyStyle = householdStyle?.buddy_style || null;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || null;

  const activeChildIds = childRows.map((child) => child.id);
  const childNameById = new Map(childRows.map((child) => [child.id, child.name]));
  const completionByChore = new Map(completionRows.map((completion) => [completion.chore_id, completion]));
  const dueChores = choreRows.filter((chore) => {
    const assignedIds = (chore.chore_assignments || []).map((row: { child_id: string }) => row.child_id);
    const activeAssignedIds = activeAssignedChildIds({ assignedChildIds: assignedIds, activeChildIds });
    const existingCompletion = completionByChore.get(chore.id);
    const completableChildIds = remainingCompletableChildIds({
      assignedChildIds: activeAssignedIds,
      existingStatus: existingCompletion?.status,
      existingParticipantIds: existingCompletion?.participant_child_ids || []
    });
    return completableChildIds.length > 0 && isChoreDueOn({
      frequency: chore.frequency,
      customSchedule: chore.custom_schedule,
      createdAt: chore.created_at,
      dueDate: today
    });
  });
  // Balance = approved earnings (positive entries) minus recorded payouts
  // (negative entries). Lifetime earned counts only the positive side.
  const familyBalance = ledgerRows.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  const lifetimeEarned = ledgerRows
    .filter((row) => Number(row.amount_cents) > 0)
    .reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  const balanceByChild = new Map<string, number>();
  for (const row of ledgerRows) {
    balanceByChild.set(row.child_id, (balanceByChild.get(row.child_id) || 0) + Number(row.amount_cents || 0));
  }
  const weekly = weeklyActivityStats(weeklyCompletionRows);
  const recentActivity = weeklyCompletionRows.slice(0, 5);
  const latestCommentByChore = new Map<string, LatestChoreComment>();
  for (const comment of commentRows) {
    if (!latestCommentByChore.has(comment.chore_id)) {
      latestCommentByChore.set(comment.chore_id, comment);
    }
  }

  const quickActions = [
    { href: "/chores/new", label: "Add Chore", icon: Plus },
    { href: "/approvals", label: approvalRows.length ? `Approve (${approvalRows.length})` : "Approve Chores", icon: CheckCircle2 },
    { href: "/children", label: "Send Reminder", icon: Bell },
    { href: "/earnings", label: "Record Payout", icon: HandCoins },
    { href: "/chores", label: "Assign Chores", icon: ListChecks },
    { href: "/notifications", label: "Recent Activity", icon: Users }
  ];

  return (
    <div className="stack dashboard-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Home Board</p>
          <h1>{firstName ? `Welcome back, ${firstName}` : "Welcome home"}</h1>
          {context.household?.name ? <p className="page-head-subtitle">{context.household.name}</p> : null}
        </div>
        <Link className="button" href="/chores/new">
          New chore
        </Link>
      </div>
      {params.error ? <p className="error">{params.error}</p> : null}
      {params.comment === "added" ? <p className="notice">Household note pinned to the chore.</p> : null}
      {params.comment === "read" ? <p className="notice">Household note marked read.</p> : null}
      {params.reminder ? <p className="notice">Reminder sent — the kids will see it on their chore view.</p> : null}
      <section className="balance-hero" aria-label="Chorely balance">
        <p className="balance-hero-amount">{centsToDollars(familyBalance)}</p>
        <p className="balance-hero-label">Chorely Balance</p>
        {childRows.length > 1 ? (
          <div className="balance-hero-children">
            {childRows.map((child) => (
              <Link className="balance-chip" href="/earnings" key={child.id}>
                <span>{child.name}</span>
                <strong>{centsToDollars(balanceByChild.get(child.id) || 0)}</strong>
              </Link>
            ))}
          </div>
        ) : null}
        <p className="balance-hero-meta">
          {centsToDollars(lifetimeEarned)} earned all-time · approved chores add to it, payouts come out
        </p>
      </section>
      <DashboardTour />
      <nav className="quick-actions" aria-label="Quick actions">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <ActiveLink className="quick-action" href={action.href} key={action.label}>
              <Icon size={20} aria-hidden="true" />
              <span>{action.label}</span>
            </ActiveLink>
          );
        })}
      </nav>
      <section className="content-grid">
        <div className="stack">
          <article className="card">
            <h2>Today&apos;s Chores ({dueChores.length})</h2>
            <div className="list">
              {dueChores.length ? dueChores.slice(0, 6).map((chore) => (
                <div className="mini-chore-card" key={chore.id}>
                  <div className="list-item">
                    <div><strong>{chore.title}</strong><p className="meta">{chore.frequency} / {centsToDollars(chore.reward_cents)}</p></div>
                    <div className="actions">
                      <ChoreBell choreId={chore.id} source="/dashboard" />
                      <Link className="secondary-button" href={`/chores/${chore.id}/edit`}>Edit</Link>
                    </div>
                  </div>
                  <ChoreCommentPanel choreId={chore.id} source="/dashboard" latestComment={latestCommentByChore.get(chore.id)} />
                </div>
              )) : <p className="muted">No chores are due today.</p>}
            </div>
          </article>
          <details className="card collapsible-card" open={approvalRows.length > 0}>
            <summary>
              <h2>Ready to Approve ({approvalRows.length})</h2>
            </summary>
            <div className="list">
              {approvalRows.length ? approvalRows.map((approval) => (
                <div className="list-item" key={approval.id}>
                  <span>{((Array.isArray(approval.chores) ? approval.chores[0] : approval.chores) as { title?: string } | null)?.title || "Chore"}</span>
                  <Link className="button" href="/approvals">Review</Link>
                </div>
              )) : <p className="muted">No pending approvals.</p>}
            </div>
          </details>
          <details className="card collapsible-card">
            <summary>
              <h2>Family Activity</h2>
            </summary>
            <div className="list">
              {recentActivity.length ? recentActivity.map((completion, index) => {
                const chore = (Array.isArray(completion.chores) ? completion.chores[0] : completion.chores) as { title?: string } | null;
                const names = (completion.participant_child_ids?.length
                  ? completion.participant_child_ids
                  : [completion.completed_by_child_id]
                )
                  .map((id: string | null) => (id ? childNameById.get(id) : null))
                  .filter(Boolean)
                  .join(" and ");
                const statusLabel =
                  completion.status === "approved"
                    ? "approved"
                    : completion.status === "pending"
                      ? "waiting for review"
                      : completion.status === "collecting"
                        ? "in progress together"
                        : completion.status.replace("_", " ");
                return (
                  <div className="list-item" key={`${completion.chore_id}-${completion.completed_at}-${index}`}>
                    <div>
                      <strong>{names || "Someone"}</strong>
                      <p className="meta">
                        {chore?.title || "a chore"} — {statusLabel}
                      </p>
                    </div>
                    <span className="meta">{new Date(completion.completed_at).toLocaleDateString()}</span>
                  </div>
                );
              }) : <p className="muted">Completed chores will show up here as the family gets going.</p>}
            </div>
          </details>
        </div>
        <aside className="stack">
          <BuddyCard weeklyApproved={weekly.approved} wateredToday={completionRows.length > 0} title="Sprout, the family chore buddy" style={buddyStyle} />
          <details className="card collapsible-card">
            <summary>
              <h2>This Week</h2>
            </summary>
            <p className="lead">{weekly.approved} of {weekly.submitted} approved</p>
            <p className="muted">
              Last 7 days: {weekly.pending} pending, {weekly.redoRequested} redo requested, and {weekly.rejected} rejected.
            </p>
          </details>
          <details className="card collapsible-card">
            <summary>
              <h2>Household Notes</h2>
            </summary>
            {notificationRows.length ? notificationRows.map((notification) => (
              <p className="muted" key={notification.id}>
                <strong>{notification.title}</strong>
                <br />
                {notification.body}
                <br />
                <span className="meta">
                  {new Date(notification.created_at).toLocaleString()} / {notification.read_at ? "read" : "unread"}
                </span>
              </p>
            )) : <p className="muted">Activity will appear as chores are assigned and approved.</p>}
          </details>
        </aside>
      </section>
      <Link className="fab" href="/chores/new" aria-label="Add chore">
        <Plus size={24} aria-hidden="true" />
      </Link>
    </div>
  );
}
