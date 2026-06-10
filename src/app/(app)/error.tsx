"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="empty-state">
      <p className="eyebrow">Dashboard error</p>
      <h1>Household data did not load</h1>
      <p className="muted">Try again, or check your account and subscription status.</p>
      <button className="button" type="button" onClick={reset}>
        Retry
      </button>
    </div>
  );
}
