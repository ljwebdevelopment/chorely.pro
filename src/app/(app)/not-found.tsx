import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="empty-state">
      <p className="eyebrow">Not found</p>
      <h1>This household item is unavailable</h1>
      <p className="muted">It may have been archived, deleted, or moved.</p>
      <Link className="button" href="/dashboard">
        Back to dashboard
      </Link>
    </div>
  );
}
