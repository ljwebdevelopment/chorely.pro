import { markChoreCommentReadAction, saveChoreCommentAction } from "@/lib/actions";
import { choreCommentAlertOptions, choreCommentKindLabel } from "@/lib/chore-comment-domain";

export type LatestChoreComment = {
  id: string;
  kind: string;
  alert_label: string | null;
  note: string;
  read_at: string | null;
  created_at: string;
};

type ChoreCommentPanelProps = {
  choreId: string;
  source: "/chores" | "/dashboard" | "/child";
  latestComment?: LatestChoreComment | null;
  canMarkRead?: boolean;
};

export function ChoreCommentPanel({ choreId, source, latestComment, canMarkRead = true }: ChoreCommentPanelProps) {
  const hasFreshIssue = Boolean(latestComment && !latestComment.read_at);
  const sourceSlug = source.replace(/\//g, "").replace(/[^a-z0-9-]/gi, "");

  return (
    <div className="chore-note-panel">
      {latestComment ? (
        <div className={hasFreshIssue ? "chore-note latest is-new" : "chore-note latest"}>
          <span className="note-label">{choreCommentKindLabel(latestComment.kind)}</span>
          <strong>{hasFreshIssue ? "New household note" : "Latest household note"}</strong>
          <p>{latestComment.note}</p>
          <span className="meta">{new Date(latestComment.created_at).toLocaleString()}</span>
          {hasFreshIssue && canMarkRead ? (
            <form action={markChoreCommentReadAction}>
              <input type="hidden" name="comment_id" value={latestComment.id} />
              <input type="hidden" name="source" value={source} />
              <button className="ghost-button" type="submit">
                Mark note read
              </button>
            </form>
          ) : null}
        </div>
      ) : (
        <p className="muted">No household notes yet.</p>
      )}
      <form className="chore-note-form" action={saveChoreCommentAction}>
        <input type="hidden" name="chore_id" value={choreId} />
        <input type="hidden" name="source" value={source} />
        <div className="field full">
          <label htmlFor={`note-${sourceSlug}-${choreId}`}>Add Note</label>
          <textarea
            id={`note-${sourceSlug}-${choreId}`}
            name="note"
            maxLength={500}
            placeholder="Leave a Supply Note, Chore Issue, or Household Note"
          />
        </div>
        <fieldset className="field full checkbox-group">
          <legend>Quick supply alerts</legend>
          <div className="quick-alerts">
            {choreCommentAlertOptions.map((alert) => (
              <button className="quick-alert-button" type="submit" name="alert_label" value={alert} key={alert}>
                {alert}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="actions">
          <button className="secondary-button" type="submit" name="kind" value="household_note">
            Add Household Note
          </button>
          <button className="secondary-button" type="submit" name="kind" value="supply_note">
            Add Supply Note
          </button>
          <button className="secondary-button" type="submit" name="kind" value="chore_issue">
            Add Chore Issue
          </button>
        </div>
      </form>
    </div>
  );
}
