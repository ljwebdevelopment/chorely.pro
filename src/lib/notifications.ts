import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function createNotification(input: {
  householdId: string | null;
  userId: string;
  type: string;
  title: string;
  body: string;
}) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: new Error("Notification service is not configured.") };
  }

  const supabase = createSupabaseAdminClient();
  return supabase.from("notifications").insert({
    household_id: input.householdId,
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body
  });
}
