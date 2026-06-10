import type { CompletionStatus } from "@/lib/chore-domain";

const reviewActions = ["approved", "rejected", "redo_requested"] as const;
const maxApprovalNoteLength = 500;

export type ReviewAction = (typeof reviewActions)[number];

export function isReviewAction(value: string): value is ReviewAction {
  return reviewActions.includes(value as ReviewAction);
}

export function canReviewCompletion(status: CompletionStatus | string | null | undefined) {
  return status === "pending";
}

export function reviewWriteFailureMessage(input: { wroteRow?: boolean }) {
  if (!input.wroteRow) {
    return "This completion was already reviewed by another action.";
  }

  return "Unable to record this review right now.";
}

export function approvalNoteError(value: string) {
  return value.trim().length > maxApprovalNoteLength ? `Review note must be ${maxApprovalNoteLength} characters or fewer.` : null;
}

export function approvalSideEffectFailureMessage(input: { target: "event" | "earnings" | "onboarding" | "notification" }) {
  if (input.target === "earnings") {
    return "The review was recorded, but earnings could not be added. Please retry from the earnings history or contact support.";
  }
  if (input.target === "onboarding") {
    return "The review was recorded, but onboarding progress could not be updated.";
  }
  if (input.target === "notification") {
    return "The review was recorded, but the notification could not be saved.";
  }

  return "The review was recorded, but the audit event could not be saved.";
}
