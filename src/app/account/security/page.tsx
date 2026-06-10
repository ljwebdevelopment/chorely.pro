import { updatePasswordAction } from "@/lib/actions";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const params = await searchParams;
  return (
    <form className="form-card form-grid" action={updatePasswordAction}>
      <div className="field full">
        <p className="eyebrow">Security</p>
        <h1>Change password</h1>
        {params.error ? <p className="error">{params.error}</p> : null}
        {params.updated ? <p className="notice">Password updated.</p> : null}
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
  );
}
