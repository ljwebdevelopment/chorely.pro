"use client";

import { useEffect, useState } from "react";
import { pollOnce } from "@/components/notification-bridge";

const DISMISSED_KEY = "chorely:notification-prompt-dismissed";

export function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Defer a frame so the permission/localStorage read syncs after hydration
    // without triggering a cascading render inside the effect body.
    const frame = requestAnimationFrame(() => {
      if (!("Notification" in window)) return;
      if (Notification.permission !== "default") return;
      if (localStorage.getItem(DISMISSED_KEY) === "true") return;
      setVisible(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  }

  async function enable() {
    const result = await Notification.requestPermission();
    if (result === "granted") pollOnce().catch(() => undefined);
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={dismiss}>
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label="Enable notifications" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>Enable Notifications</h2>
        </div>
        <p className="muted">
          Turn on browser notifications so you never miss a chore approval, reminder, or update — even when Chorely isn&apos;t open.
        </p>
        <div className="modal-actions">
          <button className="button" type="button" onClick={enable}>
            Enable Notifications
          </button>
          <button className="ghost-button" type="button" onClick={dismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
