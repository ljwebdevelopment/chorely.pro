import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const [{ data: notifications, error }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id,type,title,body,created_at")
      .eq("user_id", user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null)
  ]);

  if (error) {
    return NextResponse.json({ error: "Notifications could not be loaded." }, { status: 500 });
  }

  return NextResponse.json({ notifications: notifications || [], unreadCount: count || 0 });
}
