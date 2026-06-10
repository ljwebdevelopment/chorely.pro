import { completeChoreAction, markNotificationReadAction } from "@/lib/actions";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { activeAssignedChildIds, isChoreDueOn, remainingCompletableChildIds } from "@/lib/chore-domain";
import { requirePageData } from "@/lib/page-data";
import { ChoreCommentPanel, type LatestChoreComment } from "@/components/chore-comments";
import { BuddyCard } from "@/components/chore-buddy";
import { dailyMotivationalMessage } from "@/lib/buddy-domain";
import { weeklyActivityStats } from "@/lib/report-domain";

export default async function ChildViewPage({ searchParams }: { searchParams: Promise<{ error?: string; completed?: string; comment?: string }> }) {
  const params = await searchParams;
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const supabase = await createSupabaseServerClient();
  const householdId = context.household!.id;
  const today = new Date();
  const dueOn = today.toISOString().slice(0, 10);
  const [
    { data: children, error: childrenError },
    { data: chores, error: choresError },
    { data: completions, error: completionsError },
    { data: weeklyCompletions, error: weeklyCompletionsError },
    { data: reminders }
  ] = await Promise.all([
    supabase.from("children").select("id,name").eq("household_id", householdId).is("archived_at", null),
    supabase
      .from("chores")
      .select("id,title,description,reward_cents,frequency,custom_schedule,created_at,split_payment_enabled,chore_assignments(child_id)")
      .eq("household_id", householdId)
      .eq("active", true),
    supabase
      .from("chore_completions")
      .select("chore_id,status,participant_child_ids")
      .eq("household_id", householdId)
      .eq("due_on", dueOn)
      .in("status", ["collecting", "pending", "approved"]),
    supabase
      .from("chore_completions")
      .select("status,chore_id,completed_at")
      .eq("household_id", householdId)
      .in("status", ["collecting", "pending", "approved", "rejected", "redo_requested"]),
    supabase
      .from("notifications")
      .select("id,body,created_at")
      .eq("user_id", context.user.id)
      .eq("type", "child_reminder")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(3)
  ]);
  const childRows = requirePageData({ data: children, error: childrenError, label: "Child profiles" });
  const choreRows = requirePageData({ data: chores, error: choresError, label: "Child view chores" });
  const completionRows = requirePageData({ data: completions, error: completionsError, label: "Child view completions" });
  const weeklyCompletionRows = requirePageData({ data: weeklyCompletions, error: weeklyCompletionsError, label: "Child view weekly progress" });
  const weekly = weeklyActivityStats(weeklyCompletionRows);
  const reminderRows = reminders || [];
  const completionByChore = new Map(completionRows.map((completion) => [completion.chore_id, completion]));
  const activeChildIds = childRows.map((child) => child.id);
  const availableDueChores = choreRows.flatMap((chore) => {
    const assignedIds = (chore.chore_assignments || []).map((row: { child_id: string }) => row.child_id);
    const activeAssignedIds = activeAssignedChildIds({ assignedChildIds: assignedIds, activeChildIds });
    const existingCompletion = completionByChore.get(chore.id);
    const completableChildIds = remainingCompletableChildIds({
      assignedChildIds: activeAssignedIds,
      existingStatus: existingCompletion?.status,
      existingParticipantIds: existingCompletion?.participant_child_ids || []
    });
    const due = isChoreDueOn({
      frequency: chore.frequency,
      customSchedule: chore.custom_schedule,
      createdAt: chore.created_at,
      dueDate: today
    });
    return due && completableChildIds.length ? [{ ...chore, activeAssignedIds: completableChildIds }] : [];
  });
  const dueChoreIds = availableDueChores.map((chore) => chore.id);
  const { data: comments, error: commentsError } = dueChoreIds.length
    ? await supabase
        .from("chore_comments")
        .select("id,chore_id,kind,alert_label,note,read_at,created_at")
        .eq("household_id", householdId)
        .in("chore_id", dueChoreIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  const commentRows = requirePageData({ data: comments, error: commentsError, label: "Child view household notes" });
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
          <p className="eyebrow">Kids&apos; Chore View</p>
          <h1>Mark chores complete</h1>
          <p className="muted">{dailyMotivationalMessage()}</p>
        </div>
      </div>
      {reminderRows.map((reminder) => (
        <div className="notice reminder-notice" key={reminder.id}>
          <span>
            <strong>A note from your parent:</strong> {reminder.body}
          </span>
          <form action={markNotificationReadAction}>
            <input type="hidden" name="id" value={reminder.id} />
            <input type="hidden" name="source" value="/child" />
            <button className="secondary-button" type="submit">
              Got it
            </button>
          </form>
        </div>
      ))}
      <BuddyCard weeklyApproved={weekly.approved} wateredToday={completionRows.length > 0} />
      {params.error ? <p className="error">{params.error}</p> : null}
      {params.completed === "approval" ? <p className="notice">Chore submitted for parent approval.</p> : null}
      {params.completed === "progress" ? (
        <p className="notice">Progress saved. This shared chore stays active until every assigned child completes it.</p>
      ) : null}
      {params.comment === "added" ? <p className="notice">Household note added for a parent to see.</p> : null}
      {params.comment === "read" ? <p className="notice">Household note marked read.</p> : null}
      <section className="stack">
        {availableDueChores.length ? availableDueChores.map((chore) => {
          const assignedChildren = childRows.filter((child) => chore.activeAssignedIds.includes(child.id));
          const splitPaymentAvailable = Boolean(chore.split_payment_enabled);
          return (
            <article className="card chore-card" key={chore.id}>
              <form className="form-grid" action={completeChoreAction}>
                <input type="hidden" name="chore_id" value={chore.id} />
                <div className="field full">
                  <h2>{chore.title}</h2>
                  <p className="muted">{chore.description || "Complete the chore, then submit it for approval."}</p>
                </div>
                <div className="field">
                  <label htmlFor={`child-${chore.id}`}>Child profile</label>
                  <select id={`child-${chore.id}`} name="child_id" required>
                    {assignedChildren.map((child) => <option value={child.id} key={child.id}>{child.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`pin-${chore.id}`}>PIN</label>
                  <input id={`pin-${chore.id}`} name="pin" inputMode="numeric" minLength={4} maxLength={8} pattern="[0-9]{4,8}" required />
                </div>
                {splitPaymentAvailable ? (
                  <>
                    <fieldset className="field full checkbox-group">
                      <legend>Completed Together participants</legend>
                      <p className="meta">For split payments, include at least one other assigned child. The submitting child is always included.</p>
                      {assignedChildren.map((child) => (
                        <label className="checkbox-line" htmlFor={`participant-${chore.id}-${child.id}`} key={child.id}>
                          <input id={`participant-${chore.id}-${child.id}`} type="checkbox" name="participant_child_ids" value={child.id} />
                          {child.name}
                        </label>
                      ))}
                    </fieldset>
                    <div className="field full">
                      <label className="checkbox-line" htmlFor={`completed-together-${chore.id}`}>
                        <input id={`completed-together-${chore.id}`} type="checkbox" name="completed_together" />
                        Completed Together
                      </label>
                    </div>
                  </>
                ) : null}
                <div className="field full">
                  <label htmlFor={`note-${chore.id}`}>Completion note optional</label>
                  <textarea id={`note-${chore.id}`} name="note" maxLength={500} />
                </div>
                <div className="field full">
                  <button className="button" type="submit">Submit for approval</button>
                </div>
              </form>
              <ChoreCommentPanel choreId={chore.id} source="/child" latestComment={latestCommentByChore.get(chore.id)} canMarkRead={false} />
            </article>
          );
        }) : <div className="empty-state"><h2>No chores due today</h2><p className="muted">Ask a parent to check the schedule or create a chore with an active child assignment.</p></div>}
      </section>
    </div>
  );
}
