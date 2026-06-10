import { activeAssignedChildIds, isChoreDueOn } from "@/lib/chore-domain";

export type MilestoneChore = {
  id: string;
  frequency: string;
  custom_schedule?: string | null;
  created_at?: string | null;
  assignedChildIds: string[];
};

export function choreMilestones(input: {
  chores: MilestoneChore[];
  activeChildIds: string[];
  todayCompletedChoreIds: string[];
  weeklyCompletedChoreIds: string[];
  today?: Date;
}) {
  const today = input.today || new Date();
  const todayDone = new Set(input.todayCompletedChoreIds);
  const weeklyDone = new Set(input.weeklyCompletedChoreIds);
  const assignedChores = input.chores.filter(
    (chore) => activeAssignedChildIds({ assignedChildIds: chore.assignedChildIds, activeChildIds: input.activeChildIds }).length > 0
  );

  const dueToday = assignedChores.filter((chore) =>
    isChoreDueOn({ frequency: chore.frequency, customSchedule: chore.custom_schedule, createdAt: chore.created_at, dueDate: today })
  );
  const weeklyChores = assignedChores.filter((chore) => chore.frequency === "weekly");

  return {
    allDailyComplete: dueToday.length > 0 && dueToday.every((chore) => todayDone.has(chore.id)),
    allWeeklyComplete: weeklyChores.length > 0 && weeklyChores.every((chore) => weeklyDone.has(chore.id))
  };
}

export function milestoneNotificationPayloads(milestones: { allDailyComplete: boolean; allWeeklyComplete: boolean }) {
  const payloads: Array<{ type: string; title: string; body: string }> = [];
  if (milestones.allDailyComplete) {
    payloads.push({
      type: "all_daily_complete",
      title: "All of today's chores are done",
      body: "Every chore due today has been submitted. Time to review and approve the great work."
    });
  }
  if (milestones.allWeeklyComplete) {
    payloads.push({
      type: "all_weekly_complete",
      title: "All weekly chores are done",
      body: "Every weekly chore has been completed this week. The whole list is wrapped up."
    });
  }
  return payloads;
}

export function subscriptionNotificationForStatus(status: string, cancelAtPeriodEnd = false) {
  if (cancelAtPeriodEnd && (status === "active" || status === "trialing")) {
    return {
      type: "subscription_canceling",
      title: "Subscription cancellation scheduled",
      body: "Your Chorely access remains active until the current billing period ends."
    };
  }

  const notices: Record<string, { type: string; title: string; body: string }> = {
    past_due: {
      type: "subscription_past_due",
      title: "Subscription payment past due",
      body: "Update billing details to keep dashboard access active."
    },
    unpaid: {
      type: "subscription_unpaid",
      title: "Subscription unpaid",
      body: "Your subscription needs attention in billing settings."
    },
    incomplete: {
      type: "subscription_incomplete",
      title: "Subscription payment incomplete",
      body: "Finish checkout or update payment details to activate Chorely."
    },
    incomplete_expired: {
      type: "subscription_incomplete_expired",
      title: "Checkout session expired",
      body: "Start a new checkout session to activate Chorely."
    },
    canceled: {
      type: "subscription_canceled",
      title: "Subscription canceled",
      body: "Subscribe again to regain dashboard access."
    }
  };

  return notices[status] || null;
}

export function notificationWriteFailureMessage(input: { action: "single" | "all"; wroteRow?: boolean }) {
  if (input.action === "single" && !input.wroteRow) {
    return "This notification could not be found or was already updated.";
  }

  return input.action === "all"
    ? "Unable to mark notifications as read right now."
    : "Unable to mark this notification as read right now.";
}

export function subscriptionNotificationPersistenceFailureMessage() {
  return "Unable to persist subscription notification.";
}
