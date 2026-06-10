import Link from "next/link";
import { archiveChildAction, sendChildReminderAction } from "@/lib/actions";
import { getAppContext } from "@/lib/auth-context";
import { ChildForm } from "@/components/forms";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { centsToDollars } from "@/lib/money";
import { requirePageData } from "@/lib/page-data";
import { reminderMessages } from "@/lib/buddy-domain";

export default async function ChildrenPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; updated?: string; archived?: string; reminder?: string }>;
}) {
  const params = await searchParams;
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const supabase = await createSupabaseServerClient();
  const householdId = context.household!.id;
  const [{ data: children, error: childrenError }, { data: ledger, error: ledgerError }] = await Promise.all([
    supabase.from("children").select("id,name,avatar_url,created_at").eq("household_id", householdId).is("archived_at", null).order("created_at"),
    supabase.from("earnings_ledger").select("child_id,amount_cents").eq("household_id", householdId).eq("status", "approved")
  ]);
  const childRows = requirePageData({ data: children, error: childrenError, label: "Child profiles" });
  const ledgerRows = requirePageData({ data: ledger, error: ledgerError, label: "Child earnings" });

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Family Members</p>
          <h1>Your kids</h1>
        </div>
      </div>
      {params.error ? <p className="error">{params.error}</p> : null}
      {params.updated === "child" ? <p className="notice">Child profile saved.</p> : null}
      {params.archived === "child" ? <p className="notice">Child profile archived.</p> : null}
      {params.reminder ? <p className="notice">Reminder sent. {params.reminder} will see it on the Kids&apos; Chore View.</p> : null}
      <ChildForm />
      <section className="grid">
        {childRows.length ? childRows.map((child) => {
          const total = ledgerRows.filter((row) => row.child_id === child.id).reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
          return (
            <article className="card" key={child.id}>
              <h2>{child.name}</h2>
              <p className="muted">Lifetime earnings: {centsToDollars(total)}</p>
              <form className="stack" action={sendChildReminderAction}>
                <input type="hidden" name="child_id" value={child.id} />
                <div className="field">
                  <label htmlFor={`reminder-${child.id}`}>Send a friendly chore reminder</label>
                  <select id={`reminder-${child.id}`} name="message">
                    {reminderMessages(child.name).map((message) => (
                      <option value={message} key={message}>
                        {message}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="secondary-button" type="submit">
                  Send reminder
                </button>
              </form>
              <div className="actions">
                <Link className="secondary-button" href={`/children/${child.id}`}>Details</Link>
                <form action={archiveChildAction}>
                  <input type="hidden" name="id" value={child.id} />
                  <button className="ghost-button" type="submit">Archive</button>
                </form>
              </div>
            </article>
          );
        }) : <div className="empty-state"><h2>No children yet</h2><p className="muted">Add the first child profile above.</p></div>}
      </section>
    </div>
  );
}
