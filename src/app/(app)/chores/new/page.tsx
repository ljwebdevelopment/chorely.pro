import { ChoreForm } from "@/components/forms";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePageData } from "@/lib/page-data";

export default async function NewChorePage() {
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const supabase = await createSupabaseServerClient();
  const { data: children, error: childrenError } = await supabase
    .from("children")
    .select("id,name,avatar_url")
    .eq("household_id", context.household!.id)
    .is("archived_at", null);
  const childRows = requirePageData({ data: children, error: childrenError, label: "Child profiles" });
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">New chore</p>
          <h1>Create chore</h1>
        </div>
      </div>
      <ChoreForm childProfiles={childRows} />
    </div>
  );
}
