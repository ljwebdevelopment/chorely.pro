"use client";

export default function AccountError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="empty-state">
      <p className="eyebrow">Account error</p>
      <h1>Account settings did not load</h1>
      <p className="muted">Check your session and try again.</p>
      <button className="button" type="button" onClick={reset}>
        Retry
      </button>
    </div>
  );
}
