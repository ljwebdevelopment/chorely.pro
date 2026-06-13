import Link from "next/link";
import { redirect } from "next/navigation";
import { signUpAction } from "@/lib/actions";
import { safeRedirectPath } from "@/lib/redirect-domain";
import { TEST_MODE } from "@/lib/test-mode";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  if (TEST_MODE) redirect("/volunteer-verify");
  const params = await searchParams;
  const next = safeRedirectPath(params.next, "/dashboard");
  return (
    <form className="form-card form-grid" action={signUpAction}>
      <input type="hidden" name="next" value={next} />
      <div className="field full">
        <p className="eyebrow">Create account</p>
        <h1>Start Chorely</h1>
        {params.error ? <p className="error">{params.error}</p> : null}
      </div>
      <div className="field full">
        <label htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" required maxLength={100} autoComplete="name" />
      </div>
      <div className="field full">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
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
      <Link className="secondary-button" href={`/sign-in?next=${encodeURIComponent(next)}`}>
        Sign in instead
      </Link>
    </form>
  );
}
