import Link from "next/link";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { centsToDollars } from "@/lib/money";
import { activeAssignedChildIds, isChoreDueOn, remainingCompletableChildIds } from "@/lib/chore-domain";
import { requirePageData } from "@/lib/page-data";
import { weeklyActivityStats } from "@/lib/report-domain";
import { ChoreCommentPanel, type LatestChoreComment } from "@/components/chore-comments";
import { BuddyCard } from "@/components/chore-buddy";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ comment?: string; error?: string }> }) {
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
    { data: comments, error: commentsError }
  ] = await Promise.all([
    supabase
      .from("chores")
      .select("id,title,reward_cents,frequency,custom_schedule,created_at,chore_assignments(child_id)")
      .eq("household_id", householdId)
      .eq("active", true),
    supabase.from("chore_completions").select("id,chores(title),completed_at").eq("household_id", householdId).eq("status", "pending").limit(6),
    supabase.from("earnings_ledger").select("amount_cents").eq("household_id", householdId).eq("status", "approved"),
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
      .select("status,chore_id,completed_at,participant_child_ids,completed_by_child_id")
      .eq("household_id", householdId)
      .in("status", ["collecting", "pending", "approved", "rejected", "redo_requested"]),
    supabase
      .from("chore_comments")
      .select("id,chore_id,kind,alert_label,note,read_at,created_at")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
  ]);
  const choreRows = requirePageData({ data: chores, error: choresError, label: "Dashboard chores" });
  const approvalRows = requirePageData({ data: approvals, error: approvalsError, label: "Pending approvals" });
  const ledgerRows = requirePageData({ data: ledger, error: ledgerError, label: "Earnings summary" });
  const childRows = requirePageData({ data: children, error: childrenError, label: "Household children" });
  const notificationRows = requirePageData({ data: notifications, error: notificationsError, label: "Recent activity" });
  const completionRows = requirePageData({ data: completions, error: completionsError, label: "Dashboard completions" });
  const weeklyCompletionRows = requirePageData({ data: weeklyCompletions, error: weeklyCompletionsError, label: "Weekly progress" });
  const commentRows = requirePageData({ data: comments, error: commentsError, label: "Dashboard household notes" });

  const activeChildIds = childRows.map((child) => child.id);
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
  const total = ledgerRows.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  const weekly = weeklyActivityStats(weeklyCompletionRows);
  const latestCommentByChore = new Map<string, LatestChoreComment>();
  for (const comment of commentRows) {
    if (!latestCommentByChore.has(comment.chore_id)) {
      latestCommentByChore.set(comment.chore_id, comment);
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Home Board</p>
          <h1>Family command center</h1>
        </div>
        <Link className="button" href="/chores/new">
          New chore
        </Link>
      </div>
      {params.error ? <p className="error">{params.error}</p> : null}
      {params.comment === "added" ? <p className="notice">Household note pinned to the chore.</p> : null}
      {params.comment === "read" ? <p className="notice">Household note marked read.</p> : null}
      <section className="stats-grid">
        <div className="stat"><span>Today&apos;s Chores</span><strong>{dueChores.length}</strong></div>
        <div className="stat"><span>Pending approvals</span><strong>{approvalRows.length}</strong></div>
        <div className="stat"><span>Family Members</span><strong>{childRows.length}</strong></div>
        <div className="stat"><span>Allowance Earned</span><strong>{centsToDollars(total)}</strong></div>
      </section>
      <section className="content-grid">
        <div className="stack">
          <article className="card">
            <h2>Today&apos;s Chores</h2>
            <div className="list">
              {dueChores.length ? dueChores.slice(0, 6).map((chore) => (
                <div className="mini-chore-card" key={chore.id}>
                  <div className="list-item">
                    <div><strong>{chore.title}</strong><p className="meta">{chore.frequency} / {centsToDollars(chore.reward_cents)}</p></div>
                    <Link className="secondary-button" href={`/chores/${chore.id}/edit`}>Edit</Link>
                  </div>
                  <ChoreCommentPanel choreId={chore.id} source="/dashboard" latestComment={latestCommentByChore.get(chore.id)} />
                </div>
              )) : <p className="muted">No chores are due today.</p>}
            </div>
          </article>
          <article className="card">
            <h2>Today&apos;s Wins</h2>
            <div className="list">
              {approvalRows.length ? approvalRows.map((approval) => (
                <div className="list-item" key={approval.id}>
                  <span>{((Array.isArray(approval.chores) ? approval.chores[0] : approval.chores) as { title?: string } | null)?.title || "Chore"}</span>
                  <Link className="button" href="/approvals">Review</Link>
                </div>
              )) : <p className="muted">No pending approvals.</p>}
            </div>
          </article>
        </div>
        <aside className="stack">
          <article className="card">
            <h2>Weekly Goal</h2>
            <p className="lead">{weekly.approved} of {weekly.submitted}</p>
            <p className="muted">
              Last 7 days: {weekly.pending} pending, {weekly.redoRequested} redo requested, and {weekly.rejected} rejected.
            </p>
          </article>
          <BuddyCard weeklyApproved={weekly.approved} wateredToday={completionRows.length > 0} title="Sprout, the family chore buddy" />
          <article className="card">
            <h2>Household Notes</h2>
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
          </article>
        </aside>
      </section>
    </div>
  );
}
