import { notFound } from "next/navigation";
import { ChoreForm } from "@/components/forms";
import { markChoreCommentReadAction } from "@/lib/actions";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePageData } from "@/lib/page-data";
import { choreCommentKindLabel } from "@/lib/chore-comment-domain";

export default async function EditChorePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; comment?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const supabase = await createSupabaseServerClient();
  const householdId = context.household!.id;
  const [
    { data: chore, error: choreError },
    { data: children, error: childrenError },
    { data: assignments, error: assignmentsError },
    { data: comments, error: commentsError }
  ] = await Promise.all([
    supabase
      .from("chores")
      .select("id,title,description,reward_cents,frequency,custom_schedule,shared_completion_mode")
      .eq("id", id)
      .eq("household_id", householdId)
      .eq("active", true)
      .maybeSingle(),
    supabase.from("children").select("id,name,avatar_url").eq("household_id", householdId).is("archived_at", null),
    supabase.from("chore_assignments").select("child_id").eq("chore_id", id),
    supabase
      .from("chore_comments")
      .select("id,kind,alert_label,note,read_at,created_at")
      .eq("chore_id", id)
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
  ]);
  if (choreError) throw new Error("Chore could not be loaded.");
  if (!chore) notFound();
  const childRows = requirePageData({ data: children, error: childrenError, label: "Child profiles" });
  const assignmentRows = requirePageData({ data: assignments, error: assignmentsError, label: "Chore assignments" });
  const commentRows = requirePageData({ data: comments, error: commentsError, label: "Chore note history" });
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Edit chore</p>
          <h1>{chore.title}</h1>
        </div>
      </div>
      {query.error ? <p className="error">{query.error}</p> : null}
      {query.comment === "read" ? <p className="notice">Household note marked read.</p> : null}
      <ChoreForm childProfiles={childRows} chore={{ ...chore, assigned_child_ids: assignmentRows.map((row) => row.child_id) }} />
      <article className="card">
        <h2>Chore note history</h2>
        <div className="list">
          {commentRows.length ? commentRows.map((comment) => (
            <div className={comment.read_at ? "list-item" : "list-item note-unread"} key={comment.id}>
              <div>
                <span className="note-label">{choreCommentKindLabel(comment.kind)}</span>
                <p className="muted">{comment.note}</p>
                <p className="meta">
                  {new Date(comment.created_at).toLocaleString()} {comment.read_at ? "/ read" : "/ new"}
                </p>
              </div>
              {!comment.read_at ? (
                <form action={markChoreCommentReadAction}>
                  <input type="hidden" name="comment_id" value={comment.id} />
                  <input type="hidden" name="source" value={`/chores/${chore.id}/edit`} />
                  <button className="ghost-button" type="submit">
                    Mark read
                  </button>
                </form>
              ) : null}
            </div>
          )) : <p className="muted">No household notes have been added to this chore yet.</p>}
        </div>
      </article>
    </div>
  );
}
