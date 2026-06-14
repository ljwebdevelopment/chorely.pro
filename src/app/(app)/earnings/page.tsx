import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { centsToDollars } from "@/lib/money";
import { requirePageData } from "@/lib/page-data";
import { pendingEarningsCents } from "@/lib/report-domain";
import { recordPayoutAction } from "@/lib/actions";

function inLastDays(date: string, days: number) {
  return new Date(date).getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export default async function EarningsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; payout?: string }>;
}) {
  const params = await searchParams;
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const supabase = await createSupabaseServerClient();
  const householdId = context.household!.id;
  const [
    { data: ledger, error: ledgerError },
    { data: pending, error: pendingError },
    { data: children, error: childrenError }
  ] = await Promise.all([
    supabase
      .from("earnings_ledger")
      .select("id,child_id,amount_cents,memo,created_at,children(name),chores(title)")
      .eq("household_id", householdId)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("chore_completions")
      .select("id,status,completed_together,participant_child_ids,completed_by_child_id,chores(reward_cents)")
      .eq("household_id", householdId)
      .eq("status", "pending"),
    supabase.from("children").select("id,name,archived_at").eq("household_id", householdId)
  ]);

  const allEntries = requirePageData({ data: ledger, error: ledgerError, label: "Earnings ledger" });
  const pendingRows = requirePageData({ data: pending, error: pendingError, label: "Pending earnings" });
  const childRows = requirePageData({ data: children, error: childrenError, label: "Child profiles" });

  const earnedEntries = allEntries.filter((row) => Number(row.amount_cents) > 0);
  const payoutEntries = allEntries.filter((row) => Number(row.amount_cents) < 0);

  const lifetimeEarned = earnedEntries.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  const totalPaidOut = payoutEntries.reduce((sum, row) => sum + Math.abs(Number(row.amount_cents || 0)), 0);
  const currentBalance = allEntries.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  const monthlyEarned = earnedEntries
    .filter((row) => inLastDays(row.created_at, 30))
    .reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  const pendingTotal = pendingEarningsCents(
    pendingRows.map((row) => {
      const chore = Array.isArray(row.chores) ? row.chores[0] : row.chores;
      return { ...row, chore };
    })
  );

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Allowance</p>
          <h1>Family allowance jar</h1>
        </div>
      </div>
      {params.error ? <p className="error">{params.error}</p> : null}
      {params.payout === "recorded" ? <p className="notice">Payout recorded and balance updated.</p> : null}

      <section className="stats-grid">
        <div className="stat"><span>Current balance</span><strong>{centsToDollars(currentBalance)}</strong></div>
        <div className="stat"><span>Pending approval</span><strong>{centsToDollars(pendingTotal)}</strong></div>
        <div className="stat"><span>This month earned</span><strong>{centsToDollars(monthlyEarned)}</strong></div>
        <div className="stat"><span>Lifetime earned</span><strong>{centsToDollars(lifetimeEarned)}</strong></div>
      </section>

      <section className="grid">
        {childRows.length ? (
          childRows.map((child) => {
            const childEntries = allEntries.filter((row) => row.child_id === child.id);
            const childEarned = childEntries.filter((r) => Number(r.amount_cents) > 0).reduce((s, r) => s + Number(r.amount_cents || 0), 0);
            const childPaidOut = childEntries.filter((r) => Number(r.amount_cents) < 0).reduce((s, r) => s + Math.abs(Number(r.amount_cents || 0)), 0);
            const childBalance = childEarned - childPaidOut;
            return (
              <article className="card payout-card" key={child.id}>
                <h2>{child.name}{child.archived_at ? " (archived)" : ""}</h2>
                <div className="balance-row">
                  <span className="meta">Earned</span>
                  <strong>{centsToDollars(childEarned)}</strong>
                </div>
                <div className="balance-row">
                  <span className="meta">Paid out</span>
                  <strong className="paid-out">{centsToDollars(childPaidOut)}</strong>
                </div>
                <div className="balance-row balance-total">
                  <span>Balance</span>
                  <strong className="balance-amount">{centsToDollars(childBalance)}</strong>
                </div>
                {!child.archived_at && childBalance > 0 ? (
                  <form className="payout-form" action={recordPayoutAction}>
                    <input type="hidden" name="child_id" value={child.id} />
                    <input type="hidden" name="source" value="/earnings" />
                    <div className="payout-row">
                      <label htmlFor={`payout-amount-${child.id}`} className="sr-only">Payout amount</label>
                      <input
                        id={`payout-amount-${child.id}`}
                        name="amount"
                        type="text"
                        inputMode="decimal"
                        placeholder="$0.00"
                        required
                      />
                      <button className="button" type="submit">Record payout</button>
                    </div>
                  </form>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="empty-state">
            <h2>No children yet</h2>
            <p className="muted">Add children and approve chores to start tracking allowance earnings.</p>
          </div>
        )}
      </section>

      <article className="card">
        <h2>Earnings history</h2>
        <div className="list">
          {allEntries.length ? (
            allEntries.map((entry) => {
              const child = Array.isArray(entry.children) ? entry.children[0] : entry.children;
              const chore = Array.isArray(entry.chores) ? entry.chores[0] : entry.chores;
              const isPayout = Number(entry.amount_cents) < 0;
              return (
                <div className={`list-item${isPayout ? " payout-entry" : ""}`} key={entry.id}>
                  <div>
                    <strong>{child?.name || "Child"}</strong>
                    <p className="meta">{isPayout ? "Payout" : chore?.title || entry.memo || "Approved chore"}</p>
                    <p className="meta">{new Date(entry.created_at).toLocaleDateString()}</p>
                  </div>
                  <strong className={isPayout ? "paid-out" : ""}>{isPayout ? "-" : ""}{centsToDollars(Math.abs(Number(entry.amount_cents)))}</strong>
                </div>
              );
            })
          ) : (
            <p className="muted">No earnings or payouts yet.</p>
          )}
        </div>
      </article>

      {payoutEntries.length > 0 ? (
        <article className="card">
          <h2>Payout history</h2>
          <div className="list">
            {payoutEntries.map((entry) => {
              const child = Array.isArray(entry.children) ? entry.children[0] : entry.children;
              return (
                <div className="list-item payout-entry" key={entry.id}>
                  <div>
                    <strong>{child?.name || "Child"}</strong>
                    <p className="meta">Cash payout — {new Date(entry.created_at).toLocaleDateString()}</p>
                  </div>
                  <strong className="paid-out">-{centsToDollars(Math.abs(Number(entry.amount_cents)))}</strong>
                </div>
              );
            })}
          </div>
          <div className="list-item" style={{ marginTop: 10 }}>
            <span className="meta">Total paid out</span>
            <strong>{centsToDollars(totalPaidOut)}</strong>
          </div>
        </article>
      ) : null}
    </div>
  );
}
