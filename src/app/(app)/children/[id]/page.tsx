import { notFound } from "next/navigation";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChildForm } from "@/components/forms";
import { centsToDollars } from "@/lib/money";
import { requirePageData } from "@/lib/page-data";
import { recordPayoutAction } from "@/lib/actions";

export default async function ChildDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; updated?: string; payout?: string }>;
}) {
  const { id } = await params;
  const routeState = await searchParams;
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const supabase = await createSupabaseServerClient();
  const householdId = context.household!.id;
  const [
    { data: child, error: childError },
    { data: ledger, error: ledgerError },
    { data: completions, error: completionsError }
  ] = await Promise.all([
    supabase.from("children").select("id,name,avatar_url").eq("id", id).eq("household_id", householdId).is("archived_at", null).maybeSingle(),
    supabase
      .from("earnings_ledger")
      .select("amount_cents,created_at,memo")
      .eq("household_id", householdId)
      .eq("child_id", id)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("chore_completions")
      .select("id,status,completed_at,chores(title)")
      .eq("household_id", householdId)
      .contains("participant_child_ids", [id])
  ]);
  if (childError) throw new Error("Child profile could not be loaded.");
  if (!child) notFound();
  const ledgerRows = requirePageData({ data: ledger, error: ledgerError, label: "Child earnings" });
  const completionRows = requirePageData({ data: completions, error: completionsError, label: "Child completions" });

  const earnedCents = ledgerRows.filter((r) => Number(r.amount_cents) > 0).reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  const paidOutCents = ledgerRows.filter((r) => Number(r.amount_cents) < 0).reduce((sum, row) => sum + Math.abs(Number(row.amount_cents || 0)), 0);
  const balanceCents = earnedCents - paidOutCents;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Child profile</p>
          <h1>{child.name}</h1>
        </div>
      </div>
      <section className="stats-grid">
        <div className="stat"><span>Balance</span><strong>{centsToDollars(balanceCents)}</strong></div>
        <div className="stat"><span>Lifetime earned</span><strong>{centsToDollars(earnedCents)}</strong></div>
        <div className="stat"><span>Paid out</span><strong>{centsToDollars(paidOutCents)}</strong></div>
        <div className="stat"><span>Completions</span><strong>{completionRows.length}</strong></div>
      </section>
      {routeState.error ? <p className="error">{routeState.error}</p> : null}
      {routeState.updated === "child" ? <p className="notice">Child profile saved.</p> : null}
      {routeState.payout === "recorded" ? <p className="notice">Payout recorded and balance updated.</p> : null}
      <ChildForm child={child} />
      {balanceCents > 0 ? (
        <article className="card">
          <h2>Record payout</h2>
          <p className="muted">When you hand {child.name} their cash, record it here to keep the balance accurate.</p>
          <form className="payout-form" action={recordPayoutAction} style={{ marginTop: 12 }}>
            <input type="hidden" name="child_id" value={child.id} />
            <input type="hidden" name="source" value={`/children/${child.id}`} />
            <div className="payout-row">
              <label htmlFor="payout-amount" className="sr-only">Payout amount</label>
              <input
                id="payout-amount"
                name="amount"
                type="text"
                inputMode="decimal"
                placeholder="$0.00"
                required
              />
              <button className="button" type="submit">Record payout</button>
            </div>
          </form>
        </article>
      ) : null}
      <article className="card">
        <h2>Earnings history</h2>
        <div className="list">
          {ledgerRows.length ? (
            ledgerRows.map((entry) => {
              const isPayout = Number(entry.amount_cents) < 0;
              return (
                <div className={`list-item${isPayout ? " payout-entry" : ""}`} key={`${entry.created_at}-${entry.amount_cents}`}>
                  <div>
                    <span>{isPayout ? "Payout" : entry.memo || "Approved chore"}</span>
                    <p className="meta">{new Date(entry.created_at).toLocaleDateString()}</p>
                  </div>
                  <strong className={isPayout ? "paid-out" : ""}>
                    {isPayout ? "-" : ""}{centsToDollars(Math.abs(Number(entry.amount_cents)))}
                  </strong>
                </div>
              );
            })
          ) : (
            <p className="muted">No approved earnings yet.</p>
          )}
        </div>
      </article>
    </div>
  );
}
