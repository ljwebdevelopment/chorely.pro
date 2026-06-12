import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyVolunteerAction } from "@/lib/actions";
import { TEST_MODE } from "@/lib/test-mode";

export default async function VolunteerVerifyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!TEST_MODE) redirect("/sign-in");
  const params = await searchParams;

  return (
    <form className="form-card form-grid" action={verifyVolunteerAction}>
      <div className="field full">
        <p className="eyebrow">Volunteer testing</p>
        <h1>Claim your tester account</h1>
        <p className="lead">Enter the email and phone number you signed up with so we can match you to your tester invite.</p>
        {params.error ? <p className="error">{params.error}</p> : null}
      </div>
      <div className="field full">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field full">
        <label htmlFor="phone">Phone number</label>
        <input id="phone" name="phone" type="tel" required autoComplete="tel" />
      </div>
      <button className="button" type="submit">
        Continue
      </button>
      <Link className="secondary-button" href="/sign-in">
        Back to sign in
      </Link>
    </form>
  );
}
