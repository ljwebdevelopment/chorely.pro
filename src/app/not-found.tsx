import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="section">
      <div className="container">
        <div className="empty-state">
          <p className="eyebrow">Not found</p>
          <h1>This Chorely page does not exist</h1>
          <p className="muted">The route may have changed, or the household item may no longer be available.</p>
          <Link className="button" href="/">
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
