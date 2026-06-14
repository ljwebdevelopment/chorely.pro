import { reviewCompletionAction } from "@/lib/actions";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePageData } from "@/lib/page-data";
import { centsToDollars } from "@/lib/money";
import { shouldSplitCompletionReward, splitRewardCents } from "@/lib/chore-domain";

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ error?: string; reviewed?: string }> }) {
  const params = await searchParams;
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const supabase = await createSupabaseServerClient();
  const [
    { data: completions, error: completionsError },
    { data: children, error: childrenError }
  ] = await Promise.all([
    supabase
      .from("chore_completions")
      .select("id,completed_at,note,completed_together,completed_by_child_id,participant_child_ids,chores(title,reward_cents),children(name)")
      .eq("household_id", context.household!.id)
      .eq("status", "pending")
      .order("completed_at", { ascending: true }),
    supabase.from("children").select("id,name").eq("household_id", context.household!.id)
  ]);
  const completionRows = requirePageData({ data: completions, error: completionsError, label: "Pending approvals" });
  const childRows = requirePageData({ data: children, error: childrenError, label: "Approval child profiles" });
  const childNames = new Map(childRows.map((child) => [child.id, child.name]));

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Approvals</p>
          <h1>Pending approval queue</h1>
        </div>
      </div>
      {params.error ? <p className="error">{params.error}</p> : null}
      {params.reviewed === "approved" ? <p className="notice">Completion approved and earnings awarded.</p> : null}
      {params.reviewed === "rejected" ? <p className="notice">Completion rejected.</p> : null}
      {params.reviewed === "redo_requested" ? <p className="notice">Redo requested.</p> : null}
      <section className="stack">
        {completionRows.length ? completionRows.map((completion) => {
          const chore = Array.isArray(completion.chores) ? completion.chores[0] : completion.chores;
          const child = Array.isArray(completion.children) ? completion.children[0] : completion.children;
          const participantIds = completion.participant_child_ids?.length
            ? completion.participant_child_ids
            : [completion.completed_by_child_id].filter((id): id is string => Boolean(id));
          const splitReward = shouldSplitCompletionReward({
            completedTogether: Boolean(completion.completed_together),
            participantCount: participantIds.length
          });
          const payouts = splitRewardCents({
            rewardCents: Number(chore?.reward_cents || 0),
            participantIds,
            split: splitReward
          });
          const participantNames = participantIds.map((id: string) => childNames.get(id) || "Child profile");
          const payoutSummary = payouts
            .map((payout) => `${childNames.get(payout.childId) || "Child profile"} ${centsToDollars(payout.amountCents)}`)
            .join(" / ");
          return (
            <article className="card" key={completion.id}>
              <h2>{chore?.title || "Chore completion"}</h2>
              <p className="muted">
                Submitted by {child?.name || "child profile"} on {new Date(completion.completed_at).toLocaleString()}.
                {completion.note ? ` Note: ${completion.note}` : ""}
              </p>
              <p className="meta">Participants: {participantNames.join(", ") || child?.name || "child profile"}</p>
              <p className="meta">
                {splitReward && payouts.length > 1 ? "Approval will split" : "Approval will award"}: {payoutSummary || centsToDollars(0)}
              </p>
              <div className="actions">
                {["approved", "rejected", "redo_requested"].map((action) => (
                  <form action={reviewCompletionAction} key={action}>
                    <input type="hidden" name="completion_id" value={completion.id} />
                    <input type="hidden" name="action" value={action} />
                    <button className={action === "approved" ? "button" : "secondary-button"} type="submit">
                      {action === "approved" ? "Approve" : action === "rejected" ? "Reject" : "Request redo"}
                    </button>
                  </form>
                ))}
              </div>
            </article>
          );
        }) : <div className="empty-state"><h2>No pending approvals</h2><p className="muted">Completed chores will appear here before money is awarded.</p></div>}
      </section>
    </div>
  );
}
