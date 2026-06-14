"use client";

import { useCallback, useEffect, useState } from "react";

const LAST_NOTIFIED_KEY = "chorely:last-notified-at";
const POLL_INTERVAL_MS = 60000;

type PolledNotification = { id: string; type: string; title: string; body: string; created_at: string };

async function showBrowserNotification(notification: PolledNotification) {
  const options: NotificationOptions = {
    body: notification.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: notification.id,
    data: { url: "/notifications" }
  };
  const registration = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  if (registration) {
    await registration.showNotification(notification.title, options).catch(() => undefined);
  } else {
    new Notification(notification.title, options);
  }
}

export async function pollOnce() {
  const response = await fetch("/api/notifications/poll", { cache: "no-store" });
  if (!response.ok) return;
  const payload = (await response.json()) as { notifications: PolledNotification[]; unreadCount: number };

  if ("setAppBadge" in navigator) {
    const nav = navigator as Navigator & { setAppBadge: (count: number) => Promise<void>; clearAppBadge: () => Promise<void> };
    if (payload.unreadCount > 0) nav.setAppBadge(payload.unreadCount).catch(() => undefined);
    else nav.clearAppBadge().catch(() => undefined);
  }

  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const lastNotifiedAt = localStorage.getItem(LAST_NOTIFIED_KEY) || "";
  const fresh = payload.notifications.filter((notification) => notification.created_at > lastNotifiedAt);
  for (const notification of fresh.slice(0, 3)) {
    await showBrowserNotification(notification);
  }
  if (payload.notifications[0]) {
    localStorage.setItem(LAST_NOTIFIED_KEY, payload.notifications[0].created_at);
  }
}

export function NotificationBridge() {
  useEffect(() => {
    // Seed the marker on first run so a long backlog doesn't fire all at once.
    if (!localStorage.getItem(LAST_NOTIFIED_KEY)) {
      localStorage.setItem(LAST_NOTIFIED_KEY, new Date().toISOString());
    }
    let cancelled = false;
    const run = () => {
      if (!cancelled) pollOnce().catch(() => undefined);
    };
    run();
    const interval = setInterval(run, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return null;
}

export function EnableNotificationsButton() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | "loading">("loading");

  useEffect(() => {
    // Defer to a frame so the permission state syncs after hydration without
    // triggering a cascading render inside the effect body.
    const frame = requestAnimationFrame(() => {
      setPermission("Notification" in window ? Notification.permission : "unsupported");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const request = useCallback(async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") pollOnce().catch(() => undefined);
  }, []);

  if (permission === "loading") return null;
  if (permission === "unsupported") {
    return <p className="meta">Browser notifications are not supported on this device. New activity will always appear here.</p>;
  }
  if (permission === "granted") {
    return <p className="meta">Browser notifications are on. You&apos;ll hear about new activity even while you&apos;re in another tab or app.</p>;
  }
  if (permission === "denied") {
    return <p className="meta">Browser notifications are blocked. You can re-enable them in your browser&apos;s site settings.</p>;
  }
  return (
    <button className="secondary-button" type="button" onClick={request}>
      Turn on browser notifications
    </button>
  );
}
