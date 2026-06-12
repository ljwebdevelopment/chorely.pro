import Link from "next/link";
import { deleteAccountAction, updateHouseholdAction, updateProfileAction } from "@/lib/actions";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePageData } from "@/lib/page-data";
import { TEST_MODE } from "@/lib/test-mode";
import { FOUNDING_TESTER_BADGE_LABEL } from "@/lib/volunteer-domain";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const params = await searchParams;
  const context = await getAppContext();
  const supabase = await createSupabaseServerClient();
  const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name").eq("id", context.user.id).maybeSingle();
  const profileRow = requirePageData({ data: profile, error: profileError, label: "Account profile" });

  let isFoundingTester = false;
  if (TEST_MODE) {
    const { data: volunteer } = await supabase
      .from("volunteer_testers")
      .select("founding_tester")
      .eq("auth_user_id", context.user.id)
      .eq("founding_tester", true)
      .maybeSingle();
    isFoundingTester = Boolean(volunteer);
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>
            Account settings
            {isFoundingTester ? <span className="hero-badge founding-tester-badge">{FOUNDING_TESTER_BADGE_LABEL}</span> : null}
          </h1>
        </div>
        <Link className="secondary-button" href="/account/billing">
          Billing
        </Link>
      </div>
      {params.error ? <p className="error">{params.error}</p> : null}
      {params.updated === "profile" ? <p className="notice">Profile saved.</p> : null}
      {params.updated === "household" ? <p className="notice">Household settings saved.</p> : null}
      <form className="form-card form-grid" action={updateProfileAction}>
        <div className="field full">
          <label htmlFor="full_name">Full name</label>
          <input id="full_name" name="full_name" maxLength={100} defaultValue={profileRow.full_name || ""} />
        </div>
        <button className="button" type="submit">
          Save profile
        </button>
        <Link className="secondary-button" href="/account/security">
          Change password
        </Link>
      </form>
      {context.household ? (
        <form className="form-card form-grid" action={updateHouseholdAction}>
          <div className="field full">
            <h2>Household settings</h2>
          </div>
          <div className="field full">
            <label htmlFor="household_name">Household name</label>
            <input id="household_name" name="household_name" required maxLength={80} defaultValue={context.household.name} />
          </div>
          <button className="button" type="submit">
            Save household
          </button>
        </form>
      ) : (
        <article className="card">
          <h2>Household settings</h2>
          <p className="muted">Create your household during onboarding before editing household settings.</p>
          <Link className="secondary-button" href="/onboarding">
            Continue onboarding
          </Link>
        </article>
      )}
      <form className="form-card" action={deleteAccountAction}>
        <h2>Delete account</h2>
        <p className="muted">This permanently removes your auth account and household data.</p>
        <div className="field">
          <label htmlFor="confirmation">Type DELETE to confirm</label>
          <input id="confirmation" name="confirmation" required autoComplete="off" />
        </div>
        <button className="danger-button" type="submit">
          Delete account
        </button>
      </form>
    </div>
  );
}
