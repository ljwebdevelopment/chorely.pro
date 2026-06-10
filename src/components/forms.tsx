import { saveChildAction, saveChoreAction } from "@/lib/actions";
import type { Child, Chore } from "@/lib/types";
import { centsToDollars } from "@/lib/money";
import Link from "next/link";
import { SelectAllChildren } from "@/components/select-all-children";

type ChildFormProps = {
  child?: Pick<Child, "id" | "name" | "avatar_url">;
  source?: "onboarding";
};

export function ChildForm({ child, source }: ChildFormProps) {
  return (
    <form className="form-card form-grid" action={saveChildAction}>
      {child ? <input type="hidden" name="id" value={child.id} /> : null}
      {source ? <input type="hidden" name="source" value={source} /> : null}
      <div className="field">
        <label htmlFor="name">Child name</label>
        <input id="name" name="name" required maxLength={80} defaultValue={child?.name || ""} />
      </div>
      <div className="field">
        <label htmlFor="avatar_url">Avatar URL optional</label>
        <input id="avatar_url" name="avatar_url" type="url" maxLength={500} defaultValue={child?.avatar_url || ""} />
      </div>
      <div className="field">
        <label htmlFor="pin">Child PIN</label>
        <input
          id="pin"
          name="pin"
          inputMode="numeric"
          minLength={4}
          maxLength={8}
          pattern="[0-9]{4,8}"
          required={!child}
          placeholder={child ? "Leave blank to keep current PIN" : "4-8 digits"}
        />
      </div>
      <div className="field" style={{ alignSelf: "end" }}>
        <button className="button" type="submit">
          {child ? "Save child" : "Add child"}
        </button>
      </div>
    </form>
  );
}

type ChoreFormProps = {
  childProfiles: Pick<Child, "id" | "name" | "avatar_url">[];
  chore?: Pick<
    Chore,
    "id" | "title" | "description" | "reward_cents" | "frequency" | "custom_schedule" | "shared_completion_mode" | "split_payment_enabled"
  > & { assigned_child_ids?: string[] };
  source?: "onboarding";
};

export function ChoreForm({ childProfiles, chore, source }: ChoreFormProps) {
  const canAssignChildren = childProfiles.length > 0;

  return (
    <form className="form-card form-grid" action={saveChoreAction}>
      {chore ? <input type="hidden" name="id" value={chore.id} /> : null}
      {source ? <input type="hidden" name="source" value={source} /> : null}
      <div className="field">
        <label htmlFor="title">Chore title</label>
        <input id="title" name="title" required maxLength={80} defaultValue={chore?.title || ""} />
      </div>
      <div className="field">
        <label htmlFor="reward">What it pays</label>
        <input
          id="reward"
          name="reward"
          type="text"
          inputMode="decimal"
          placeholder="e.g. 2.50"
          required
          defaultValue={chore ? (chore.reward_cents / 100).toFixed(2) : ""}
        />
        <p className="meta">Dollars and cents — typing a $ sign is fine too.</p>
      </div>
      <div className="field full">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" maxLength={500} defaultValue={chore?.description || ""} />
      </div>
      <div className="field">
        <label htmlFor="frequency">Schedule</label>
        <select id="frequency" name="frequency" defaultValue={chore?.frequency || "daily"}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="custom_schedule">Custom schedule</label>
        <input
          id="custom_schedule"
          name="custom_schedule"
          maxLength={120}
          placeholder="Example: Mon, Wed, Fri"
          defaultValue={chore?.custom_schedule || ""}
        />
      </div>
      <div className="field">
        <label htmlFor="shared_completion_mode">Shared chore rule</label>
        <select id="shared_completion_mode" name="shared_completion_mode" defaultValue={chore?.shared_completion_mode || "any"}>
          <option value="any">Any assigned child can complete</option>
          <option value="all">Every assigned child must complete</option>
        </select>
      </div>
      <fieldset className="field checkbox-group">
        <legend>Payment behavior</legend>
        <label className="checkbox-line" htmlFor="split_payment_enabled">
          <input id="split_payment_enabled" type="checkbox" name="split_payment_enabled" defaultChecked={chore?.split_payment_enabled || false} />
          Enable Completed Together split payments
        </label>
      </fieldset>
      <fieldset className="field full checkbox-group">
        <legend>Assign children</legend>
        {childProfiles.length > 1 ? <SelectAllChildren /> : null}
        {childProfiles.length ? (
          childProfiles.map((child) => (
            <label className="checkbox-line" htmlFor={`child_ids_${child.id}`} key={child.id}>
              <input
                id={`child_ids_${child.id}`}
                type="checkbox"
                name="child_ids"
                value={child.id}
                defaultChecked={chore?.assigned_child_ids?.includes(child.id) || false}
              />
              {child.name}
            </label>
          ))
        ) : (
          <p className="muted">Add a child before assigning chores.</p>
        )}
      </fieldset>
      {chore ? (
        <div className="field full">
          <p className="meta">Current reward: {centsToDollars(chore.reward_cents)}</p>
        </div>
      ) : null}
      <div className="field full">
        <button className="button" type="submit" disabled={!canAssignChildren}>
          {chore ? "Save chore" : "Create chore"}
        </button>
        {!canAssignChildren && !source ? (
          <Link className="secondary-button" href="/children">
            Add child profile
          </Link>
        ) : null}
      </div>
    </form>
  );
}
