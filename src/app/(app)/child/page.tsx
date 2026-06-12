import { completeChoreAction, markNotificationReadAction } from "@/lib/actions";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { centsToDollars } from "@/lib/money";
import { activeAssignedChildIds, isChoreDueOn, remainingCompletableChildIds } from "@/lib/chore-domain";
import { requirePageData } from "@/lib/page-data";
import { ChoreCommentPanel, type LatestChoreComment } from "@/components/chore-comments";
import { BuddyCard } from "@/components/chore-buddy";
import { BuddyCustomizer } from "@/components/buddy-customizer";
import { dailyMotivationalMessage } from "@/lib/buddy-domain";
import { weeklyActivityStats } from "@/lib/report-domain";
import { getActiveProfile } from "@/lib/profile-session";

const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const doneDateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });

function finishedLabel(completedAt: string, now = new Date()) {
  const completed = new Date(completedAt);
  if (Number.isNaN(completed.getTime())) return null;
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(completed)) / 86400000);
  if (dayDiff <= 0) return "today";
  if (dayDiff === 1) return "yesterday";
  return doneDateFormatter.format(completed);
}

export default async function ChildViewPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; completed?: string; comment?: string; buddy?: string }>;
}) {
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
    { data: reminders },
    { data: householdStyle }
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
      .select("status,chore_id,completed_at,chores(title,reward_cents)")
      .eq("household_id", householdId)
      .in("status", ["collecting", "pending", "approved", "rejected", "redo_requested"])
      .order("completed_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("id,body,created_at")
      .eq("user_id", context.user.id)
      .eq("type", "child_reminder")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("households").select("buddy_style").eq("id", householdId).maybeSingle()
  ]);
  const childRows = requirePageData({ data: children, error: childrenError, label: "Child profiles" });
  const choreRows = requirePageData({ data: chores, error: choresError, label: "Child view chores" });
  const completionRows = requirePageData({ data: completions, error: completionsError, label: "Child view completions" });
  const weeklyCompletionRows = requirePageData({ data: weeklyCompletions, error: weeklyCompletionsError, label: "Child view weekly progress" });
  const weekly = weeklyActivityStats(weeklyCompletionRows);
  const reminderRows = reminders || [];
  const buddyStyle = householdStyle?.buddy_style || null;
  const completionByChore = new Map(completionRows.map((completion) => [completion.chore_id, completion]));
  const activeChildIds = childRows.map((child) => child.id);

  // When a child profile is active, the whole view narrows to that child.
  const activeProfile = await getActiveProfile();
  const activeChild =
    activeProfile?.type === "child" ? childRows.find((child) => child.id === activeProfile.childId) || null : null;

  // Cash App-style balance for the signed-in child: approved earnings minus
  // recorded payouts from the same ledger the parents see.
  let childBalance = 0;
  let childLifetimeEarned = 0;
  if (activeChild) {
    const { data: ledger, error: ledgerError } = await supabase
      .from("earnings_ledger")
      .select("amount_cents")
      .eq("household_id", householdId)
      .eq("child_id", activeChild.id)
      .eq("status", "approved");
    const ledgerRows = requirePageData({ data: ledger, error: ledgerError, label: "Child balance" });
    childBalance = ledgerRows.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
    childLifetimeEarned = ledgerRows
      .filter((row) => Number(row.amount_cents) > 0)
      .reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  }

  const assignedChores = choreRows.flatMap((chore) => {
    const assignedIds = (chore.chore_assignments || []).map((row: { child_id: string }) => row.child_id);
    const activeAssignedIds = activeAssignedChildIds({ assignedChildIds: assignedIds, activeChildIds });
    if (activeChild && !activeAssignedIds.includes(activeChild.id)) return [];
    return activeAssignedIds.length ? [{ ...chore, activeAssignedIds }] : [];
  });

  const availableDueChores = assignedChores.flatMap((chore) => {
    const existingCompletion = completionByChore.get(chore.id);
    const completableChildIds = remainingCompletableChildIds({
      assignedChildIds: chore.activeAssignedIds,
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

  // Non-daily chores and their next due day within the coming week.
  const upcomingChores = assignedChores.flatMap((chore) => {
    if (chore.frequency === "daily") return [];
    for (let offset = 1; offset <= 7; offset += 1) {
      const futureDate = new Date(today.getTime() + offset * 24 * 60 * 60 * 1000);
      if (isChoreDueOn({ frequency: chore.frequency, customSchedule: chore.custom_schedule, createdAt: chore.created_at, dueDate: futureDate })) {
        return [{ ...chore, dueLabel: offset === 1 ? "Tomorrow" : weekdayFormatter.format(futureDate) }];
      }
    }
    return [];
  });

  const recentlyDone = weeklyCompletionRows.slice(0, 8);
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

  const todayPotential = availableDueChores.reduce((sum, chore) => sum + Number(chore.reward_cents || 0), 0);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Kids&apos; Chore View</p>
          <h1>{activeChild ? `Hi ${activeChild.name}!` : "Mark chores complete"}</h1>
          <p className="muted">{dailyMotivationalMessage()}</p>
        </div>
      </div>
      {activeChild ? (
        <section className="balance-hero" aria-label="Your Chorely balance">
          <p className="balance-hero-amount">{centsToDollars(childBalance)}</p>
          <p className="balance-hero-label">Your Chorely Balance</p>
          <p className="balance-hero-meta">
            {centsToDollars(childLifetimeEarned)} earned all-time — finish chores below to grow it!
          </p>
        </section>
      ) : null}
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
      <BuddyCard weeklyApproved={weekly.approved} wateredToday={completionRows.length > 0} style={buddyStyle} />
      <BuddyCustomizer style={buddyStyle} source="/child" />
      {params.buddy === "saved" ? <p className="notice">Sprout&apos;s new look is saved!</p> : null}
      {params.error ? <p className="error">{params.error}</p> : null}
      {params.completed === "approval" ? <p className="notice">Chore submitted for parent approval.</p> : null}
      {params.completed === "progress" ? (
        <p className="notice">Progress saved. This shared chore stays active until every assigned child completes it.</p>
      ) : null}
      {params.comment === "added" ? <p className="notice">Household note added for a parent to see.</p> : null}
      {params.comment === "read" ? <p className="notice">Household note marked read.</p> : null}

      <nav className="kid-tabs" aria-label="Chore sections">
        <a href="#today">Today ({availableDueChores.length})</a>
        <a href="#coming-up">Coming Up ({upcomingChores.length})</a>
        <a href="#done">Done ({recentlyDone.length})</a>
      </nav>

      <section className="stack" id="today">
        <div className="kid-section-head">
          <h2>Today</h2>
          {availableDueChores.length ? (
            <span className="meta">Finish everything today and earn up to {centsToDollars(todayPotential)}</span>
          ) : null}
        </div>
        {availableDueChores.length ? availableDueChores.map((chore) => {
          const assignedChildren = childRows.filter((child) => chore.activeAssignedIds.includes(child.id));
          const selectableChildren = activeChild ? assignedChildren.filter((child) => child.id === activeChild.id) : assignedChildren;
          const splitPaymentAvailable = Boolean(chore.split_payment_enabled);
          return (
            <details className="card chore-card chore-expand" key={chore.id}>
              <summary className="kid-chore-head">
                <h2>{chore.title}</h2>
                <span className="reward-pill">{centsToDollars(chore.reward_cents)}</span>
              </summary>
              <p className="muted">{chore.description || "Complete the chore, then submit it for approval."}</p>
              <form className="form-grid" action={completeChoreAction}>
                <input type="hidden" name="chore_id" value={chore.id} />
                <div className="field">
                  <label htmlFor={`child-${chore.id}`}>Child profile</label>
                  <select id={`child-${chore.id}`} name="child_id" required>
                    {selectableChildren.map((child) => <option value={child.id} key={child.id}>{child.name}</option>)}
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
                      <p className="meta">
                        Did this one as a team? Check everyone who helped and the {centsToDollars(chore.reward_cents)} reward is split between
                        you. The submitting child is always included.
                      </p>
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
            </details>
          );
        }) : <div className="empty-state"><h2>All done for today!</h2><p className="muted">Nothing is due right now. Check Coming Up to see what&apos;s next.</p></div>}
      </section>

      <section className="stack" id="coming-up">
        <div className="kid-section-head">
          <h2>Coming Up</h2>
        </div>
        {upcomingChores.length ? (
          <div className="list">
            {upcomingChores.map((chore) => (
              <div className="list-item" key={chore.id}>
                <div>
                  <strong>{chore.title}</strong>
                  <p className="meta">{chore.dueLabel}</p>
                </div>
                <span className="reward-pill">{centsToDollars(chore.reward_cents)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No weekly or monthly chores coming up in the next 7 days.</p>
        )}
      </section>

      <section className="stack" id="done">
        <div className="kid-section-head">
          <h2>Done</h2>
          <span className="meta">{weekly.approved} approved in the last 7 days</span>
        </div>
        {recentlyDone.length ? (
          <div className="list">
            {recentlyDone.map((completion, index) => {
              const chore = (Array.isArray(completion.chores) ? completion.chores[0] : completion.chores) as
                | { title?: string; reward_cents?: number }
                | null;
              const statusLabel =
                completion.status === "approved"
                  ? "Approved — money earned!"
                  : completion.status === "pending"
                    ? "Waiting for a parent to review"
                    : completion.status === "collecting"
                      ? "Team chore in progress"
                      : completion.status === "redo_requested"
                        ? "Parent asked for a redo"
                        : "Not approved";
              const finished = finishedLabel(completion.completed_at);
              return (
                <div className="list-item" key={`${completion.chore_id}-${completion.completed_at}-${index}`}>
                  <div>
                    <strong>{chore?.title || "Chore"}</strong>
                    <p className="meta">
                      {statusLabel}
                      {finished ? ` · Finished ${finished}` : ""}
                    </p>
                  </div>
                  <span className={completion.status === "approved" ? "reward-pill" : "meta"}>
                    {chore?.reward_cents != null ? centsToDollars(Number(chore.reward_cents)) : ""}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">Chores you finish will show up here with their status.</p>
        )}
      </section>
    </div>
  );
}
