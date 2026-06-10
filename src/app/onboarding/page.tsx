import {
  completeOnboardingAction,
  createHouseholdAction,
  reviewCompletionAction,
  submitExampleCompletionAction
} from "@/lib/actions";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChildForm, ChoreForm } from "@/components/forms";
import { PwaInstallGuide } from "@/components/pwa-install-guide";
import { missingOnboardingSteps, nextOnboardingActions } from "@/lib/onboarding-domain";
import { requirePageData } from "@/lib/page-data";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string; error?: string; updated?: string }> }) {
  const params = await searchParams;
  const context = await getAppContext();
  const supabase = await createSupabaseServerClient();
  const [
    { data: state, error: stateError },
    { data: children, error: childrenError },
    { data: chores, error: choresError },
    { data: completions, error: completionsError }
  ] = await Promise.all([
    supabase
      .from("onboarding_state")
      .select("household_created,children_added,rewards_set,first_chore_created,example_approved,earnings_reviewed,pwa_reviewed")
      .eq("user_id", context.user.id)
      .maybeSingle(),
    context.household
      ? supabase.from("children").select("id,name,avatar_url").eq("household_id", context.household.id).is("archived_at", null)
      : Promise.resolve({ data: [], error: null }),
    context.household
      ? supabase.from("chores").select("id").eq("household_id", context.household.id).eq("active", true).limit(1)
      : Promise.resolve({ data: [], error: null }),
    context.household
      ? supabase
          .from("chore_completions")
          .select("id,chores(title)")
          .eq("household_id", context.household.id)
          .eq("status", "pending")
          .limit(1)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (stateError) throw new Error("Onboarding state could not be loaded.");
  const childList = requirePageData({ data: children, error: childrenError, label: "Onboarding children" });
  const choreList = requirePageData({ data: chores, error: choresError, label: "Onboarding chores" });
  const completionList = requirePageData({ data: completions, error: completionsError, label: "Onboarding approvals" });
  const pending = completionList[0];
  const missingSteps = missingOnboardingSteps(state);
  const nextActions = nextOnboardingActions(state);
  const visibleMissingSteps = nextActions.length ? nextActions : missingSteps;

  return (
    <main className="section">
      <div className="container stack">
        <div className="page-head">
          <div>
            <p className="eyebrow">Guided setup</p>
            <h1>Welcome to Chorely! Let&apos;s set up your household.</h1>
            <p className="lead">
              This walkthrough takes about five minutes. You&apos;ll add your kids, create your first paid chore, and see
              exactly how completing, approving, and paying out works — then you&apos;re off to your dashboard.
            </p>
          </div>
        </div>
        {params.error ? <p className="error">{params.error}</p> : null}
        {params.updated === "child" ? <p className="notice">Child profile saved. Continue by creating the first chore.</p> : null}
        {params.updated === "chore" ? <p className="notice">First chore saved. Continue with the example completion.</p> : null}
        {!state?.household_created || !context.household ? (
          <form className="form-card form-grid" action={createHouseholdAction}>
            <div className="field full">
              <h2>1. Name your household</h2>
              <p className="muted">
                This is the family name everyone sees inside the app — something like &quot;The Garcia House&quot; works
                great.
              </p>
            </div>
            <div className="field full">
              <label htmlFor="name">Household name</label>
              <input id="name" name="name" required maxLength={80} placeholder="The Garcia House" />
            </div>
            <button className="button" type="submit">
              Create household
            </button>
          </form>
        ) : (
          <article className="card">
            <h2>1. Household created</h2>
            <p className="muted">{context.household.name}</p>
          </article>
        )}

        {context.household ? (
          <>
            <section className="stack">
              <article className="card">
                <h2>2. Add your children</h2>
                <p className="muted">
                  Kids don&apos;t need email accounts — each child gets a profile inside your family account, plus a
                  4-digit PIN they&apos;ll use to mark chores complete on the Kids&apos; Chore View. Add everyone now or
                  start with one child; you can always add more later from the Family Members page.
                </p>
              </article>
              <ChildForm source="onboarding" />
              {childList.length ? <p className="notice">{childList.length} child profile{childList.length === 1 ? "" : "s"} added.</p> : null}
            </section>

            {childList.length ? (
              <section className="stack">
                <article className="card">
                  <h2>3. Create your first chore</h2>
                  <p className="muted">
                    Give the chore a name, set the dollar amount it pays, and choose how often it repeats — daily chores
                    show up every day, weekly chores on the days you pick, and monthly or custom schedules cover
                    everything else. Assign it to one child, or to several: shared chores can be done by any assigned
                    child, or require everyone to pitch in, with the payment split between them.
                  </p>
                </article>
                <ChoreForm childProfiles={childList} source="onboarding" />
              </section>
            ) : null}

            {choreList.length ? (
              <section className="card">
                <h2>4. See how approval works</h2>
                {pending ? (
                  <form action={reviewCompletionAction} className="stack">
                    <input type="hidden" name="completion_id" value={pending.id} />
                    <input type="hidden" name="source" value="onboarding" />
                    <input type="hidden" name="action" value="approved" />
                    <p className="muted">
                      A practice completion is waiting for your review — exactly what you&apos;ll see when your kids mark
                      real chores done. Approve it and watch the reward land in the earnings ledger.
                    </p>
                    <button className="button" type="submit">
                      Approve example
                    </button>
                  </form>
                ) : (
                  <form action={submitExampleCompletionAction}>
                    <p className="muted">
                      Here&apos;s the heart of Chorely: kids mark a chore complete, and you approve it before any money is
                      earned. Try it now with a practice completion — submit it, then approve it to see how earnings are
                      awarded.
                    </p>
                    <button className="button" type="submit">
                      Submit example completion
                    </button>
                  </form>
                )}
              </section>
            ) : null}

            <section className="card">
              <h2>5. Track earnings and pay out</h2>
              <p className="muted">
                Every approved chore adds to a child&apos;s balance on the Allowance page, where you can review earnings
                by week, month, and lifetime. When you hand over real money — cash, savings jar, or a transfer — record it
                as a payout so the balance always shows what&apos;s still owed.
              </p>
            </section>

            <section className="card">
              <h2>6. Put Chorely on your phones</h2>
              <PwaInstallGuide />
              {missingSteps.length ? (
                <p className="error">Complete next: {visibleMissingSteps.join(", ")}.</p>
              ) : (
                <p className="notice">All setup steps are complete. You can finish onboarding.</p>
              )}
              <form action={completeOnboardingAction}>
                <button className="button" type="submit" disabled={Boolean(missingSteps.length)}>
                  Finish onboarding
                </button>
              </form>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
