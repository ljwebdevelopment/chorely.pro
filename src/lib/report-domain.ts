import { shouldSplitCompletionReward, splitRewardCents } from "@/lib/chore-domain";

export type ReportCompletion = {
  status: string;
  chore_id: string | null;
  completed_at?: string | null;
  participant_child_ids?: string[] | null;
  completed_by_child_id?: string | null;
  completed_together?: boolean | null;
};

export type ReportLedgerEntry = {
  child_id: string;
  amount_cents: number;
};

export type ReportChore = {
  id: string;
  title: string;
};

export type PendingEarningCompletion = {
  status: string;
  completed_together?: boolean | null;
  participant_child_ids?: string[] | null;
  completed_by_child_id?: string | null;
  chore?: {
    reward_cents?: number | null;
    split_payment_enabled?: boolean | null;
  } | null;
};

export function householdCompletionStats(completions: ReportCompletion[]) {
  const totalCompletions = completions.length;
  const approvedCompletions = completions.filter((completion) => completion.status === "approved").length;
  return {
    totalCompletions,
    approvedCompletions,
    completionPercentage: totalCompletions ? Math.round((approvedCompletions / totalCompletions) * 100) : 0
  };
}

export function mostCompletedChore(chores: ReportChore[], completions: ReportCompletion[]) {
  const [top] = chores
    .map((chore) => ({
      title: chore.title,
      count: completions.filter((completion) => completion.chore_id === chore.id && completion.status === "approved").length
    }))
    .sort((a, b) => b.count - a.count);

  return top?.count ? top : null;
}

export function childReportStats(input: {
  childId: string;
  completions: ReportCompletion[];
  ledger: ReportLedgerEntry[];
}) {
  const approvedCompletions = input.completions.filter((completion) => {
    if (completion.status !== "approved") return false;
    const participants = completion.participant_child_ids?.length
      ? completion.participant_child_ids
      : [completion.completed_by_child_id].filter((id): id is string => Boolean(id));
    return participants.includes(input.childId);
  }).length;

  const earnedCents = input.ledger
    .filter((entry) => entry.child_id === input.childId)
    .reduce((sum, entry) => sum + Number(entry.amount_cents || 0), 0);

  return { approvedCompletions, earnedCents };
}

export function weeklyActivityStats(completions: ReportCompletion[], now = new Date()) {
  const weekStart = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const weekly = completions.filter((completion) => {
    if (!completion.completed_at) return false;
    const completedAt = new Date(completion.completed_at).getTime();
    return Number.isFinite(completedAt) && completedAt >= weekStart && completedAt <= now.getTime();
  });

  return {
    submitted: weekly.length,
    approved: weekly.filter((completion) => completion.status === "approved").length,
    pending: weekly.filter((completion) => completion.status === "pending").length,
    redoRequested: weekly.filter((completion) => completion.status === "redo_requested").length,
    rejected: weekly.filter((completion) => completion.status === "rejected").length
  };
}

export function pendingEarningsCents(completions: PendingEarningCompletion[]) {
  return completions
    .filter((completion) => completion.status === "pending")
    .reduce((sum, completion) => {
      const participants = completion.participant_child_ids?.length
        ? completion.participant_child_ids
        : [completion.completed_by_child_id].filter((id): id is string => Boolean(id));
      const rewardCents = Number(completion.chore?.reward_cents || 0);
      const splitReward = shouldSplitCompletionReward({
        splitPaymentEnabled: Boolean(completion.chore?.split_payment_enabled),
        completedTogether: Boolean(completion.completed_together)
      });
      const payouts = splitRewardCents({
        rewardCents,
        participantIds: participants,
        splitPaymentEnabled: splitReward
      });

      return sum + payouts.reduce((payoutSum, payout) => payoutSum + payout.amountCents, 0);
    }, 0);
}
