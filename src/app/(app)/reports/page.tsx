import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { childReportStats, householdCompletionStats, mostCompletedChore, weeklyActivityStats } from "@/lib/report-domain";
import { centsToDollars } from "@/lib/money";
import { requirePageData } from "@/lib/page-data";

export default async function ReportsPage() {
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const supabase = await createSupabaseServerClient();
  const householdId = context.household!.id;
  const [
    { data: chores, error: choresError },
    { data: completions, error: completionsError },
    { data: children, error: childrenError },
    { data: ledger, error: ledgerError }
  ] = await Promise.all([
    supabase.from("chores").select("id,title,active").eq("household_id", householdId),
    supabase
      .from("chore_completions")
      .select("id,status,chore_id,completed_at,participant_child_ids,completed_by_child_id")
      .eq("household_id", householdId),
    supabase.from("children").select("id,name,archived_at").eq("household_id", householdId),
    supabase.from("earnings_ledger").select("id,child_id,amount_cents").eq("household_id", householdId).eq("status", "approved")
  ]);

  const choreRows = requirePageData({ data: chores, error: choresError, label: "Report chores" });
  const completionRows = requirePageData({ data: completions, error: completionsError, label: "Report completions" });
  const childRows = requirePageData({ data: children, error: childrenError, label: "Report children" });
  const ledgerRows = requirePageData({ data: ledger, error: ledgerError, label: "Report earnings" });
  const { totalCompletions, approvedCompletions, completionPercentage } = householdCompletionStats(completionRows);
  const mostCompleted = mostCompletedChore(choreRows, completionRows);
  const weekly = weeklyActivityStats(completionRows);
  const activeChildren = childRows.filter((child) => !child.archived_at);
  const activeChores = choreRows.filter((chore) => chore.active);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Reports</p>
          <h1>Household statistics</h1>
        </div>
      </div>
      <section className="stats-grid">
        <div className="stat"><span>Completion percentage</span><strong>{completionPercentage}%</strong></div>
        <div className="stat"><span>Total submissions</span><strong>{totalCompletions}</strong></div>
        <div className="stat"><span>Approved completions</span><strong>{approvedCompletions}</strong></div>
        <div className="stat"><span>Most completed</span><strong>{mostCompleted?.title || "None"}</strong></div>
        <div className="stat"><span>Active children</span><strong>{activeChildren.length}</strong></div>
        <div className="stat"><span>Active chores</span><strong>{activeChores.length}</strong></div>
      </section>
      <section className="grid">
        {childRows.length ? childRows.map((child) => {
          const stats = childReportStats({ childId: child.id, completions: completionRows, ledger: ledgerRows });
          return (
            <article className="card" key={child.id}>
              <h2>{child.name}{child.archived_at ? " (archived)" : ""}</h2>
              <p className="muted">Approved completions: {stats.approvedCompletions}</p>
              <p className="muted">Current balance: {centsToDollars(stats.earnedCents)}</p>
            </article>
          );
        }) : <div className="empty-state"><h2>No child reports yet</h2><p className="muted">Add children and approve chores to build performance reports.</p></div>}
      </section>
      <article className="card">
        <h2>Weekly activity summary</h2>
        <p className="muted">
          Last 7 days: {weekly.submitted} submitted, {weekly.approved} approved, {weekly.pending} pending, {weekly.redoRequested} redo requested,
          and {weekly.rejected} rejected.
        </p>
      </article>
    </div>
  );
}
