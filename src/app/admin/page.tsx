import { redirect } from "next/navigation";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

const adminSections = [
  {
    title: "Volunteer Testers",
    description: "Track who has claimed a volunteer account and their testing status."
  },
  {
    title: "Recent Signups",
    description: "New households that have created an account."
  },
  {
    title: "System Notes",
    description: "Internal notes and reminders for things to follow up on."
  },
  {
    title: "Suggestions",
    description: "Feature ideas and feedback collected from testers."
  }
];

type BugReportRow = {
  id: string;
  name: string | null;
  email: string | null;
  page_path: string | null;
  device_type: string | null;
  what_happened: string;
  what_trying_to_do: string | null;
  status: string;
  created_at: string;
};

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const admin = createSupabaseAdminClient();
  const { data: bugReports } = await admin
    .from("bug_reports")
    .select("id,name,email,page_path,device_type,what_happened,what_trying_to_do,status,created_at")
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<BugReportRow[]>();

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Admin Dashboard</h1>
          <p className="page-head-subtitle">Welcome back, Luke</p>
        </div>
      </div>
      <section className="grid">
        <article className="card">
          <h2>Bug Reports</h2>
          {bugReports && bugReports.length > 0 ? (
            <div className="stack">
              {bugReports.map((report) => (
                <div className="list-item" key={report.id}>
                  <div>
                    <p>{report.what_happened}</p>
                    <p className="meta">
                      {[report.name || report.email, report.device_type, report.page_path]
                        .filter(Boolean)
                        .join(" — ")}
                      {" — "}
                      {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="meta">{report.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="muted">Bugs and issues submitted by testers will show up here.</p>
              <p className="meta">No bug reports yet</p>
            </>
          )}
        </article>
        {adminSections.map((section) => (
          <article className="card" key={section.title}>
            <h2>{section.title}</h2>
            <p className="muted">{section.description}</p>
            <p className="meta">Coming soon</p>
          </article>
        ))}
      </section>
    </>
  );
}
