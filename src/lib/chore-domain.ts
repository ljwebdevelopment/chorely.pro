export type SharedCompletionMode = "any" | "all";
export type CompletionStatus = "collecting" | "pending" | "approved" | "rejected" | "redo_requested";
export type ChoreScheduleFrequency = "daily" | "weekly" | "monthly" | "custom";

const weekdayAliases = new Map([
  ["sun", 0],
  ["sunday", 0],
  ["mon", 1],
  ["monday", 1],
  ["tue", 2],
  ["tues", 2],
  ["tuesday", 2],
  ["wed", 3],
  ["wednesday", 3],
  ["thu", 4],
  ["thur", 4],
  ["thurs", 4],
  ["thursday", 4],
  ["fri", 5],
  ["friday", 5],
  ["sat", 6],
  ["saturday", 6]
]);

export function uniqueIds(ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

export function validateAssignedParticipants(input: {
  assignedChildIds: string[];
  completedByChildId: string;
  requestedParticipantIds: string[];
  completedTogether: boolean;
}) {
  const assigned = new Set(input.assignedChildIds);
  if (!assigned.has(input.completedByChildId)) {
    throw new Error("This child is not assigned to the selected chore.");
  }

  if (input.completedTogether && input.assignedChildIds.length < 2) {
    throw new Error("Completed Together requires at least two assigned children.");
  }

  const requested = uniqueIds(input.requestedParticipantIds.length ? input.requestedParticipantIds : [input.completedByChildId]);
  const participants = input.completedTogether ? uniqueIds([input.completedByChildId, ...requested]) : [input.completedByChildId];

  for (const participantId of participants) {
    if (!assigned.has(participantId)) {
      throw new Error("Completed Together participants must be assigned to the chore.");
    }
  }

  if (input.completedTogether && participants.length < 2) {
    throw new Error("Select at least two assigned children for Completed Together.");
  }

  return participants;
}

export function validateChoreAssignmentIds(input: { availableChildIds: string[]; requestedChildIds: string[] }) {
  const requested = uniqueIds(input.requestedChildIds);
  if (!requested.length) {
    throw new Error("Assign at least one active child to this chore.");
  }

  const available = new Set(input.availableChildIds);
  for (const childId of requested) {
    if (!available.has(childId)) {
      throw new Error("Chore assignments must use active children in this household.");
    }
  }

  return requested;
}

const scheduleFrequencies = ["daily", "weekly", "monthly", "custom"] as const;
const sharedCompletionModes = ["any", "all"] as const;
const maxChoreTitleLength = 80;
const maxChoreDescriptionLength = 500;
const maxChoreCustomScheduleLength = 120;
const maxCompletionNoteLength = 500;

export function validateChoreScheduleFrequency(value: string): ChoreScheduleFrequency {
  if (scheduleFrequencies.includes(value as ChoreScheduleFrequency)) {
    return value as ChoreScheduleFrequency;
  }

  throw new Error("Choose a valid chore schedule.");
}

export function validateSharedCompletionMode(value: string): SharedCompletionMode {
  if (sharedCompletionModes.includes(value as SharedCompletionMode)) {
    return value as SharedCompletionMode;
  }

  throw new Error("Choose a valid shared chore rule.");
}

export function choreTitleError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Chore title is required.";
  if (trimmed.length > maxChoreTitleLength) return `Chore title must be ${maxChoreTitleLength} characters or fewer.`;
  return null;
}

export function choreDescriptionError(value: string) {
  return value.trim().length > maxChoreDescriptionLength ? `Chore description must be ${maxChoreDescriptionLength} characters or fewer.` : null;
}

function scheduleTokenAllowed(input: { frequency: ChoreScheduleFrequency; token: string }) {
  const hasWeekday = weekdayAliases.has(input.token);
  const day = Number.parseInt(input.token, 10);
  const hasMonthDay = Number.isInteger(day) && String(day) === input.token && day >= 1 && day <= 31;

  if (input.frequency === "weekly") return hasWeekday;
  if (input.frequency === "monthly") return hasMonthDay;
  if (input.frequency === "custom") return hasWeekday || hasMonthDay;
  return true;
}

export function choreCustomScheduleError(input: { frequency: ChoreScheduleFrequency; value: string }) {
  const trimmed = input.value.trim();
  if (trimmed.length > maxChoreCustomScheduleLength) return `Custom schedule must be ${maxChoreCustomScheduleLength} characters or fewer.`;
  if (!trimmed) return input.frequency === "custom" ? "Custom schedule is required for custom chores." : null;
  if (input.frequency === "daily") return null;

  const tokens = scheduleTokens(trimmed);
  const invalidToken = tokens.find((token) => !scheduleTokenAllowed({ frequency: input.frequency, token }));
  if (!invalidToken) return null;

  if (input.frequency === "weekly") return "Weekly schedules must use weekday names like Mon, Wed, Fri.";
  if (input.frequency === "monthly") return "Monthly schedules must use day numbers from 1 to 31.";
  return "Custom schedules must use weekday names or day numbers from 1 to 31.";
}

export function activeAssignedChildIds(input: { assignedChildIds: string[]; activeChildIds: string[] }) {
  const active = new Set(input.activeChildIds);
  return uniqueIds(input.assignedChildIds).filter((childId) => active.has(childId));
}

function dateParts(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return {
    weekday: date.getUTCDay(),
    dayOfMonth: date.getUTCDate()
  };
}

function scheduleTokens(schedule: string | null | undefined) {
  return String(schedule || "")
    .split(/[\s,;|/]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

export function isChoreDueOn(input: {
  frequency: ChoreScheduleFrequency | string;
  customSchedule?: string | null;
  createdAt?: string | null;
  dueDate: Date | string;
}) {
  const due = dateParts(input.dueDate);
  if (input.frequency === "daily") return true;

  const tokens = scheduleTokens(input.customSchedule);
  const weekdays = tokens.flatMap((token) => {
    const weekday = weekdayAliases.get(token);
    return weekday === undefined ? [] : [weekday];
  });
  const monthDays = tokens.flatMap((token) => {
    const day = Number.parseInt(token, 10);
    return Number.isInteger(day) && day >= 1 && day <= 31 ? [day] : [];
  });

  if (input.frequency === "weekly") {
    if (weekdays.length) return weekdays.includes(due.weekday);
    return input.createdAt ? due.weekday === dateParts(input.createdAt).weekday : true;
  }

  if (input.frequency === "monthly") {
    if (monthDays.length) return monthDays.includes(due.dayOfMonth);
    return input.createdAt ? due.dayOfMonth === dateParts(input.createdAt).dayOfMonth : true;
  }

  if (input.frequency === "custom") {
    return weekdays.includes(due.weekday) || monthDays.includes(due.dayOfMonth);
  }

  return true;
}

export function nextCompletionState(input: {
  sharedCompletionMode: SharedCompletionMode;
  assignedChildIds: string[];
  existingParticipantIds: string[];
  newParticipantIds: string[];
}) {
  const participants = uniqueIds([...input.existingParticipantIds, ...input.newParticipantIds]);
  const status: CompletionStatus =
    input.sharedCompletionMode === "all" && !input.assignedChildIds.every((childId) => participants.includes(childId))
      ? "collecting"
      : "pending";

  return { participants, status };
}

export function completionProgressContributionError(input: {
  existingStatus?: CompletionStatus | string | null;
  existingParticipantIds: string[];
  newParticipantIds: string[];
}) {
  if (input.existingStatus !== "collecting") return null;
  const existing = new Set(input.existingParticipantIds);
  const contributesProgress = input.newParticipantIds.some((participantId) => !existing.has(participantId));
  return contributesProgress ? null : "This child has already submitted progress for this shared chore.";
}

export function canAddCompletionProgress(status: CompletionStatus | string | null | undefined) {
  return status === "collecting";
}

export function completionSubmissionError(status: CompletionStatus | string | null | undefined) {
  if (status === "pending") return "This chore is already waiting for parent approval.";
  if (status === "approved") return "This chore has already been approved for today.";
  return null;
}

export function remainingCompletableChildIds(input: {
  assignedChildIds: string[];
  existingStatus?: CompletionStatus | string | null;
  existingParticipantIds?: string[] | null;
}) {
  if (completionSubmissionError(input.existingStatus)) return [];
  const assigned = uniqueIds(input.assignedChildIds);
  if (input.existingStatus !== "collecting") return assigned;

  const existingParticipants = new Set(input.existingParticipantIds || []);
  return assigned.filter((childId) => !existingParticipants.has(childId));
}

export function completionRedirectState(status: CompletionStatus | string | null | undefined) {
  return status === "collecting" ? "progress" : "approval";
}

export function completionWriteFailureMessage(input: { errorCode?: string | null; wroteRow?: boolean }) {
  if (input.errorCode === "23505") {
    return "This chore was already submitted for today.";
  }

  if (!input.wroteRow) {
    return "This chore was updated by another submission. Please refresh and try again.";
  }

  return "Unable to submit this chore right now.";
}

export function completionNoteError(value: string) {
  return value.trim().length > maxCompletionNoteLength ? `Completion note must be ${maxCompletionNoteLength} characters or fewer.` : null;
}

export function completionSideEffectFailureMessage(input: { target: "notification" }) {
  return input.target === "notification" ? "Chore was submitted, but the notification could not be saved." : "Unable to finish chore submission.";
}

export function choreSaveFailureMessage(input: {
  target: "children" | "chore" | "assignments" | "onboarding" | "notification" | "delete" | "completions";
  wroteRow?: boolean;
}) {
  if (!input.wroteRow) {
    if (input.target === "children") return "Active children could not be loaded for this chore.";
    if (input.target === "chore") return "Chore could not be saved. Please refresh and try again.";
    if (input.target === "assignments") return "Chore was saved, but assignments could not be updated.";
    if (input.target === "onboarding") return "Chore was saved, but onboarding could not be updated.";
    if (input.target === "notification") return "Chore was saved, but the assignment notification could not be saved.";
    if (input.target === "completions") return "Chore was archived, but pending completions could not be cleared.";
    return "Chore could not be found or was already updated.";
  }

  if (input.target === "completions") return "Chore was archived, but pending completions could not be cleared.";
  return input.target === "delete" ? "Unable to archive this chore right now." : "Unable to save this chore right now.";
}

export function shouldSplitCompletionReward(input: { completedTogether: boolean; participantCount: number }) {
  return input.completedTogether && input.participantCount > 1;
}

export function splitRewardCents(input: { rewardCents: number; participantIds: string[]; split: boolean }) {
  const participants = uniqueIds(input.participantIds);
  if (!participants.length) return [];
  if (!input.split || participants.length === 1) {
    return participants.map((childId) => ({ childId, amountCents: input.rewardCents }));
  }

  const base = Math.floor(input.rewardCents / participants.length);
  const remainder = input.rewardCents - base * participants.length;

  return participants.map((childId, index) => ({
    childId,
    amountCents: base + (index === 0 ? remainder : 0)
  }));
}
