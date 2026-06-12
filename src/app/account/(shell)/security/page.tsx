import { saveParentPinAction, updatePasswordAction } from "@/lib/actions";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const params = await searchParams;
  const context = await getAppContext();
  const supabase = await createSupabaseServerClient();
  // parent_pin_hash ships in migration 005; tolerate its absence.
  const { data: profileRow } = await supabase.from("profiles").select("parent_pin_hash").eq("id", context.user.id).maybeSingle();
  const hasParentPin = Boolean(profileRow?.parent_pin_hash);

  return (
    <div className="stack">
      <form className="form-card form-grid" action={updatePasswordAction}>
        <div className="field full">
          <p className="eyebrow">Security</p>
          <h1>Change password</h1>
          {params.error ? <p className="error">{params.error}</p> : null}
          {params.updated === "password" || params.updated === "1" || params.updated === "true" ? (
            <p className="notice">Password updated.</p>
          ) : null}
          {params.updated === "pin" ? <p className="notice">Parent PIN saved. You&apos;ll be asked for it on the profile screen.</p> : null}
          {params.updated === "pin-removed" ? <p className="notice">Parent PIN removed.</p> : null}
        </div>
        <div className="field full">
          <label htmlFor="password">New password</label>
          <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
        </div>
        <div className="field full">
          <label htmlFor="password_confirmation">Confirm new password</label>
          <input id="password_confirmation" name="password_confirmation" type="password" minLength={8} required autoComplete="new-password" />
        </div>
        <button className="button" type="submit">
          Update password
        </button>
      </form>

      <form className="form-card form-grid" action={saveParentPinAction}>
        <div className="field full">
          <h2>Parent profile PIN</h2>
          <p className="muted">
            {hasParentPin
              ? "Your parent profile is PIN-protected on the “Who's using Chorely?” screen. Set a new PIN below, or remove it."
              : "Add an optional PIN so kids can't open the parent profile from the “Who's using Chorely?” screen."}
          </p>
        </div>
        <div className="field">
          <label htmlFor="parent_pin">{hasParentPin ? "New parent PIN" : "Parent PIN"}</label>
          <input
            id="parent_pin"
            name="parent_pin"
            inputMode="numeric"
            minLength={4}
            maxLength={8}
            pattern="[0-9]{4,8}"
            placeholder="4-8 digits"
            required
          />
        </div>
        <div className="field" style={{ alignSelf: "end" }}>
          <button className="button" type="submit">
            {hasParentPin ? "Update parent PIN" : "Set parent PIN"}
          </button>
        </div>
      </form>
      {hasParentPin ? (
        <form action={saveParentPinAction}>
          <input type="hidden" name="action" value="remove" />
          <button className="ghost-button" type="submit">
            Remove parent PIN
          </button>
        </form>
      ) : null}
    </div>
  );
}
