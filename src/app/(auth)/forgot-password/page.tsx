import Link from "next/link";
import { forgotPasswordAction } from "@/lib/actions";
import { safeRedirectPath } from "@/lib/redirect-domain";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string; next?: string }> }) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next, "/account/security");
  return (
    <form className="form-card form-grid" action={forgotPasswordAction}>
      <input type="hidden" name="next" value={next} />
      <div className="field full">
        <p className="eyebrow">Password reset</p>
        <h1>Recover your account</h1>
        {params.error ? <p className="error">{params.error}</p> : null}
        {params.sent ? <p className="notice">Check your email for a secure password reset link.</p> : null}
      </div>
      <div className="field full">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <button className="button" type="submit">
        Send reset link
      </button>
      <Link className="secondary-button" href={`/sign-in?next=${encodeURIComponent(next)}`}>
        Back to sign in
      </Link>
    </form>
  );
}
