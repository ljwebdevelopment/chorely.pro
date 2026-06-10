"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="section">
      <div className="container">
        <div className="empty-state">
          <p className="eyebrow">Error</p>
          <h1>Something needs attention</h1>
          <p className="muted">Chorely could not load this view. Try again, or return to the dashboard.</p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "8px" }}>
            <button className="button" type="button" onClick={reset}>
              Try again
            </button>
            <Link className="secondary-button" href="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
