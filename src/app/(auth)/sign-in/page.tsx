import Link from "next/link";
import { signInAction } from "@/lib/actions";
import { safeRedirectPath } from "@/lib/redirect-domain";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next, "/dashboard");
  return (
    <form className="form-card form-grid" action={signInAction}>
      <input type="hidden" name="next" value={next} />
      <div className="field full">
        <p className="eyebrow">Sign in</p>
        <h1>Welcome back</h1>
        {params.error ? <p className="error">{params.error}</p> : null}
      </div>
      <div className="field full">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field full">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <button className="button" type="submit">
        Sign in
      </button>
      <Link className="secondary-button" href={`/forgot-password?next=${encodeURIComponent(next)}`}>
        Forgot password
      </Link>
      <Link className="ghost-button" href={`/sign-up?next=${encodeURIComponent(next)}`}>
        Create account
      </Link>
    </form>
  );
}
