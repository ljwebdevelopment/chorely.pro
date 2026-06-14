"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DISMISSED_KEY = "chorely:test-mode-banner-dismissed";

export function TestModeBanner({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    // Defer a frame so the localStorage read syncs after hydration without a
    // cascading render inside the effect body.
    const frame = requestAnimationFrame(() => {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (dismissed) return null;

  return (
    <div className="test-mode-banner">
      <span>{message}</span>
      <button
        className="ghost-button"
        type="button"
        aria-label="Dismiss test mode banner"
        onClick={() => {
          localStorage.setItem(DISMISSED_KEY, "true");
          setDismissed(true);
        }}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
