import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions";
import { EnableNotificationsButton } from "@/components/notification-bridge";
import { getAppContext } from "@/lib/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePageData } from "@/lib/page-data";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const params = await searchParams;
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const supabase = await createSupabaseServerClient();
  const { data: notifications, error: notificationsError } = await supabase
    .from("notifications")
    .select("id,title,body,created_at,read_at")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false });
  const notificationRows = requirePageData({ data: notifications, error: notificationsError, label: "Notifications" });
  const unreadCount = notificationRows.filter((notification) => !notification.read_at).length;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Household Notes</p>
          <h1>Family bulletin board</h1>
          <p className="muted">{unreadCount} unread household note{unreadCount === 1 ? "" : "s"}</p>
        </div>
        {unreadCount ? (
          <form action={markAllNotificationsReadAction}>
            <button className="secondary-button" type="submit">Mark all read</button>
          </form>
        ) : null}
      </div>
      {params.error ? <p className="error">{params.error}</p> : null}
      {params.updated === "single" ? <p className="notice">Household note marked read.</p> : null}
      {params.updated === "all" ? <p className="notice">All household notes marked read.</p> : null}
      <article className="card">
        <h2>Browser notifications</h2>
        <p className="muted">
          Get a heads-up on your phone or computer when chores are completed, all of the day&apos;s chores are done, or a
          reminder is sent — even while you&apos;re busy in another tab or app.
        </p>
        <EnableNotificationsButton />
      </article>
      <section className="stack">
        {notificationRows.length ? notificationRows.map((notification) => (
          <article className="list-item" key={notification.id}>
            <div>
              <strong>{notification.title}</strong>
              <p className="muted">{notification.body}</p>
              <p className="meta">{new Date(notification.created_at).toLocaleString()} {notification.read_at ? "/ read" : "/ unread"}</p>
            </div>
            {!notification.read_at ? (
              <form action={markNotificationReadAction}>
                <input type="hidden" name="id" value={notification.id} />
                <button className="secondary-button" type="submit">Mark read</button>
              </form>
            ) : null}
          </article>
        )) : <div className="empty-state"><h2>No household notes</h2><p className="muted">Assignment, approval, supply, and subscription notes will appear here.</p></div>}
      </section>
    </div>
  );
}
