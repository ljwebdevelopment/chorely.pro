import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="form-card">
      <p className="eyebrow">Verify email</p>
      <h1>Check your inbox</h1>
      <p className="lead">Open the verification link from Supabase to finish creating your Chorely account.</p>
      <Link className="button" href="/sign-in">
        Continue to sign in
      </Link>
    </div>
  );
}
