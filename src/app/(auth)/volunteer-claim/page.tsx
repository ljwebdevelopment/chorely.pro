import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { claimVolunteerAction } from "@/lib/actions";
import { TEST_MODE, VOLUNTEER_VERIFY_COOKIE } from "@/lib/test-mode";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { volunteerVerificationExpiredMessage } from "@/lib/volunteer-domain";

export default async function VolunteerClaimPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!TEST_MODE) redirect("/sign-in");
  const params = await searchParams;

  const store = await cookies();
  const volunteerId = store.get(VOLUNTEER_VERIFY_COOKIE)?.value;
  if (!volunteerId) {
    redirect(`/volunteer-verify?error=${encodeURIComponent(volunteerVerificationExpiredMessage())}`);
  }

  const admin = createSupabaseAdminClient();
  const { data: volunteer } = await admin
    .from("volunteer_testers")
    .select("name,email,auth_user_id")
    .eq("id", volunteerId)
    .maybeSingle();
  if (!volunteer || volunteer.auth_user_id) {
    redirect(`/volunteer-verify?error=${encodeURIComponent(volunteerVerificationExpiredMessage())}`);
  }

  return (
    <form className="form-card form-grid" action={claimVolunteerAction}>
      <div className="field full">
        <p className="eyebrow">Volunteer testing</p>
        <h1>Hi {volunteer.name}, choose a password</h1>
        <p className="lead">We&apos;ll create your account for {volunteer.email}.</p>
        {params.error ? <p className="error">{params.error}</p> : null}
      </div>
      <div className="field full">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="field full">
        <label htmlFor="password_confirmation">Confirm password</label>
        <input id="password_confirmation" name="password_confirmation" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <button className="button" type="submit">
        Create account
      </button>
    </form>
  );
}
