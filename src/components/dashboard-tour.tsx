"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, HandCoins, ListChecks, Users, X } from "lucide-react";

const TOUR_DISMISSED_KEY = "chorely:dashboard-tour-dismissed";
const TOUR_SEEN_KEY = "chorely:dashboard-tour-seen";

const tourCards = [
  {
    icon: ListChecks,
    title: "Assign chores",
    body: "Create a chore, put a dollar amount on it, and pick which kids it belongs to. Daily and weekly chores show up on the right days automatically."
  },
  {
    icon: CheckCircle2,
    title: "Approve the work",
    body: "When kids mark a chore done, it lands in Approvals. Money is only earned after you approve — you can also reject or ask for a redo."
  },
  {
    icon: HandCoins,
    title: "Pay allowance",
    body: "Approved chores build each child's balance on the Allowance page. When you hand over real cash, record the payout so the balance stays honest."
  },
  {
    icon: Bell,
    title: "Stay in the loop",
    body: "Household Notes collects everything that happens — completions, reminders, milestones. Tap the bell on any chore to nudge the kids."
  },
  {
    icon: Users,
    title: "Family profiles",
    body: "Each child has a profile with their own PIN for the Kids' Chore View. Manage profiles, PINs, and reminders from Family Members."
  }
];

export function DashboardTour() {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    // Defer a frame so the localStorage read syncs after hydration without a
    // cascading render inside the effect body.
    const frame = requestAnimationFrame(() => {
      const dismissed = localStorage.getItem(TOUR_DISMISSED_KEY) === "true";
      const seen = localStorage.getItem(TOUR_SEEN_KEY) === "true";
      setVisible(!dismissed && !seen);
      if (!seen) localStorage.setItem(TOUR_SEEN_KEY, "true");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (visible === null) return null;

  if (!visible) {
    return (
      <button
        className="ghost-button tour-reopen"
        type="button"
        onClick={() => {
          localStorage.removeItem(TOUR_DISMISSED_KEY);
          setVisible(true);
        }}
      >
        Show the quick tour
      </button>
    );
  }

  return (
    <section className="card tour-card" aria-label="Getting started tour">
      <div className="tour-head">
        <div>
          <p className="eyebrow">Quick tour</p>
          <h2>How Chorely works</h2>
        </div>
        <button
          className="ghost-button"
          type="button"
          aria-label="Dismiss tour"
          onClick={() => {
            localStorage.setItem(TOUR_DISMISSED_KEY, "true");
            setVisible(false);
          }}
        >
          <X size={18} aria-hidden="true" /> Dismiss
        </button>
      </div>
      <div className="tour-grid">
        {tourCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="tour-step" key={card.title}>
              <Icon size={20} color="#7FA66A" aria-hidden="true" />
              <h3>{card.title}</h3>
              <p className="muted">{card.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
