import Link from "next/link";
import { deleteChoreAction } from "@/lib/actions";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { centsToDollars } from "@/lib/money";
import { requirePageData } from "@/lib/page-data";
import { ChoreCommentPanel, type LatestChoreComment } from "@/components/chore-comments";

export default async function ChoresPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string; archived?: string; comment?: string }> }) {
  const params = await searchParams;
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const supabase = await createSupabaseServerClient();
  const { data: chores, error: choresError } = await supabase
    .from("chores")
    .select("id,title,reward_cents,frequency,shared_completion_mode,split_payment_enabled,created_at,chore_assignments(children(name))")
    .eq("household_id", context.household!.id)
    .eq("active", true)
    .order("created_at", { ascending: false });
  const choreRows = requirePageData({ data: chores, error: choresError, label: "Chores" });
  const choreIds = choreRows.map((chore) => chore.id);
  const { data: comments, error: commentsError } = choreIds.length
    ? await supabase
        .from("chore_comments")
        .select("id,chore_id,kind,alert_label,note,read_at,created_at")
        .eq("household_id", context.household!.id)
        .in("chore_id", choreIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  const commentRows = requirePageData({ data: comments, error: commentsError, label: "Chore household notes" });
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
          <p className="eyebrow">Chores</p>
          <h1>Kitchen chore board</h1>
        </div>
        <Link className="button" href="/chores/new">Add chore</Link>
      </div>
      {params.error ? <p className="error">{params.error}</p> : null}
      {params.updated === "chore" ? <p className="notice">Chore card saved.</p> : null}
      {params.archived === "chore" ? <p className="notice">Chore tucked away.</p> : null}
      {params.comment === "added" ? <p className="notice">Household note saved on the chore card.</p> : null}
      {params.comment === "read" ? <p className="notice">Household note marked read.</p> : null}
      <section className="stack">
        {choreRows.length ? choreRows.map((chore) => (
          <article className="card chore-card" key={chore.id}>
            <div className="list-item">
              <div>
                <h2>{chore.title}</h2>
                <p className="muted">
                  {centsToDollars(chore.reward_cents)} / {chore.frequency} / shared rule: {chore.shared_completion_mode}
                  {chore.split_payment_enabled ? " / split payments enabled" : ""}
                </p>
              </div>
              <div className="actions">
                <Link className="secondary-button" href={`/chores/${chore.id}/edit`}>Edit</Link>
                <form action={deleteChoreAction}>
                  <input type="hidden" name="id" value={chore.id} />
                  <button className="ghost-button" type="submit">Archive</button>
                </form>
              </div>
            </div>
            <ChoreCommentPanel choreId={chore.id} source="/chores" latestComment={latestCommentByChore.get(chore.id)} />
          </article>
        )) : <div className="empty-state"><h2>No chores yet</h2><p className="muted">Add the first chore card to your family board.</p></div>}
      </section>
    </div>
  );
}
