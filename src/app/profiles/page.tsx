import { selectProfileAction, signOutAction } from "@/lib/actions";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePageData } from "@/lib/page-data";
import { profileInitials } from "@/lib/profile-domain";
import { BrandLogo } from "@/components/brand";

export const dynamic = "force-dynamic";

export default async function ProfilesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const supabase = await createSupabaseServerClient();
  const householdId = context.household!.id;

  const [{ data: children, error: childrenError }, { data: profileRow }] = await Promise.all([
    supabase.from("children").select("id,name").eq("household_id", householdId).is("archived_at", null).order("created_at"),
    // parent_pin_hash + full_name tolerate the pre-migration database shape.
    supabase.from("profiles").select("full_name,parent_pin_hash").eq("id", context.user.id).maybeSingle()
  ]);
  const childRows = requirePageData({ data: children, error: childrenError, label: "Profile switcher children" });
  const parentName = profileRow?.full_name?.trim() || "Parent";
  const parentHasPin = Boolean(profileRow?.parent_pin_hash);

  return (
    <main className="section profiles-screen">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="profiles-brand">
          <BrandLogo />
        </div>
        <div className="section-head" style={{ margin: "28px auto 8px", textAlign: "center", maxWidth: "none" }}>
          <p className="eyebrow">{context.household!.name}</p>
          <h1>Who&apos;s using Chorely?</h1>
        </div>
        {params.error ? <p className="error">{params.error}</p> : null}
        <div className="profile-grid">
          <form className="profile-tile" action={selectProfileAction}>
            <input type="hidden" name="profile" value="parent" />
            <span className="profile-avatar profile-avatar-parent">{profileInitials(parentName)}</span>
            <strong>{parentName}</strong>
            <span className="profile-role">Parent</span>
            {parentHasPin ? (
              <>
                <label className="sr-only" htmlFor="parent-pin">
                  Parent PIN
                </label>
                <input
                  id="parent-pin"
                  name="pin"
                  inputMode="numeric"
                  minLength={4}
                  maxLength={8}
                  pattern="[0-9]{4,8}"
                  placeholder="Parent PIN"
                  required
                />
              </>
            ) : null}
            <button className="button" type="submit">
              {parentHasPin ? "Unlock" : "Continue"}
            </button>
          </form>
          {childRows.map((child) => (
            <form className="profile-tile" action={selectProfileAction} key={child.id}>
              <input type="hidden" name="profile" value={child.id} />
              <span className="profile-avatar">{profileInitials(child.name)}</span>
              <strong>{child.name}</strong>
              <span className="profile-role">Child</span>
              <button className="button" type="submit">
                Continue
              </button>
            </form>
          ))}
        </div>
        <p className="muted" style={{ textAlign: "center" }}>
          Kids: pick your name to see your chores. Parents: you can add a PIN to your profile under Account → Security.
        </p>
        <form action={signOutAction} style={{ textAlign: "center" }}>
          <button className="ghost-button" type="submit">
            Sign out of the family account
          </button>
        </form>
      </div>
    </main>
  );
}
