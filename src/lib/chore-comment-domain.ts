export const choreCommentAlertOptions = [
  "Out of cat food",
  "Out of dog food",
  "No cleaning supplies",
  "Need trash bags",
  "Need laundry detergent",
  "Need paper towels",
  "Need toilet paper",
  "Vacuum not working",
  "Couldn't complete chore"
] as const;

export type ChoreCommentAlert = (typeof choreCommentAlertOptions)[number];
export type ChoreCommentKind = "household_note" | "supply_note" | "chore_issue";

const maxChoreCommentLength = 500;
const commentKinds = ["household_note", "supply_note", "chore_issue"] as const;

export function choreCommentTextError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Add a household note or choose a quick issue before saving.";
  if (trimmed.length > maxChoreCommentLength) return `Chore notes must be ${maxChoreCommentLength} characters or fewer.`;
  return null;
}

export function normalizeChoreCommentKind(value: string): ChoreCommentKind {
  return commentKinds.includes(value as ChoreCommentKind) ? (value as ChoreCommentKind) : "household_note";
}

export function normalizeChoreCommentAlert(value: string | null | undefined) {
  if (!value) return null;
  return choreCommentAlertOptions.includes(value as ChoreCommentAlert) ? (value as ChoreCommentAlert) : null;
}

export function choreCommentKindLabel(kind: ChoreCommentKind | string | null | undefined) {
  if (kind === "supply_note") return "Supply Note";
  if (kind === "chore_issue") return "Chore Issue";
  return "Household Note";
}
