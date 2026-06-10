import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeAssignedChildIds,
  canAddCompletionProgress,
  choreCustomScheduleError,
  choreDescriptionError,
  completionNoteError,
  completionProgressContributionError,
  choreSaveFailureMessage,
  choreTitleError,
  completionSideEffectFailureMessage,
  completionRedirectState,
  completionSubmissionError,
  completionWriteFailureMessage,
  isChoreDueOn,
  nextCompletionState,
  remainingCompletableChildIds,
  shouldSplitCompletionReward,
  splitRewardCents,
  validateAssignedParticipants,
  validateChoreAssignmentIds,
  validateChoreScheduleFrequency,
  validateSharedCompletionMode
} from "../src/lib/chore-domain";

describe("shared chore completion rules", () => {
  it("keeps all-child shared chores collecting until every assigned child participates", () => {
    const first = nextCompletionState({
      sharedCompletionMode: "all",
      assignedChildIds: ["child-a", "child-b"],
      existingParticipantIds: [],
      newParticipantIds: ["child-a"]
    });

    assert.equal(first.status, "collecting");
    assert.deepEqual(first.participants, ["child-a"]);

    const second = nextCompletionState({
      sharedCompletionMode: "all",
      assignedChildIds: ["child-a", "child-b"],
      existingParticipantIds: first.participants,
      newParticipantIds: ["child-b"]
    });

    assert.equal(second.status, "pending");
    assert.deepEqual(second.participants, ["child-a", "child-b"]);
  });

  it("moves any-child shared chores straight to pending approval", () => {
    const state = nextCompletionState({
      sharedCompletionMode: "any",
      assignedChildIds: ["child-a", "child-b"],
      existingParticipantIds: [],
      newParticipantIds: ["child-a"]
    });

    assert.equal(state.status, "pending");
  });

  it("only allows existing completion progress while an all-child chore is collecting", () => {
    assert.equal(canAddCompletionProgress("collecting"), true);
    assert.equal(canAddCompletionProgress("pending"), false);
    assert.equal(canAddCompletionProgress("approved"), false);
    assert.equal(canAddCompletionProgress(null), false);
  });

  it("rejects collecting progress updates that do not add a new participant", () => {
    assert.equal(
      completionProgressContributionError({
        existingStatus: "collecting",
        existingParticipantIds: ["child-a"],
        newParticipantIds: ["child-a"]
      }),
      "This child has already submitted progress for this shared chore."
    );

    assert.equal(
      completionProgressContributionError({
        existingStatus: "collecting",
        existingParticipantIds: ["child-a"],
        newParticipantIds: ["child-b"]
      }),
      null
    );

    assert.equal(
      completionProgressContributionError({
        existingStatus: "pending",
        existingParticipantIds: ["child-a"],
        newParticipantIds: ["child-a"]
      }),
      null
    );
  });

  it("blocks duplicate submissions after pending approval or same-day approval", () => {
    assert.equal(completionSubmissionError("collecting"), null);
    assert.equal(completionSubmissionError("rejected"), null);
    assert.equal(completionSubmissionError("redo_requested"), null);
    assert.equal(completionSubmissionError(null), null);
    assert.equal(completionSubmissionError("pending"), "This chore is already waiting for parent approval.");
    assert.equal(completionSubmissionError("approved"), "This chore has already been approved for today.");
  });

  it("keeps only remaining children available while shared chores collect progress", () => {
    assert.deepEqual(
      remainingCompletableChildIds({
        assignedChildIds: ["child-a", "child-b", "child-c"],
        existingStatus: "collecting",
        existingParticipantIds: ["child-a"]
      }),
      ["child-b", "child-c"]
    );
    assert.deepEqual(
      remainingCompletableChildIds({
        assignedChildIds: ["child-a", "child-b"],
        existingStatus: "pending",
        existingParticipantIds: ["child-a"]
      }),
      []
    );
    assert.deepEqual(
      remainingCompletableChildIds({
        assignedChildIds: ["child-a", "child-a", "child-b"],
        existingStatus: null
      }),
      ["child-a", "child-b"]
    );
  });

  it("uses different child-view notices for collecting progress and approval-ready submissions", () => {
    assert.equal(completionRedirectState("collecting"), "progress");
    assert.equal(completionRedirectState("pending"), "approval");
    assert.equal(completionRedirectState("approved"), "approval");
  });

  it("turns completion write failures into parent-friendly retry messages", () => {
    assert.equal(completionWriteFailureMessage({ errorCode: "23505", wroteRow: false }), "This chore was already submitted for today.");
    assert.equal(
      completionWriteFailureMessage({ wroteRow: false }),
      "This chore was updated by another submission. Please refresh and try again."
    );
    assert.equal(completionWriteFailureMessage({ errorCode: "42501", wroteRow: true }), "Unable to submit this chore right now.");
    assert.equal(completionSideEffectFailureMessage({ target: "notification" }), "Chore was submitted, but the notification could not be saved.");
  });

  it("validates completion notes before submission writes", () => {
    assert.equal(completionNoteError("A helpful note"), null);
    assert.equal(completionNoteError("x".repeat(501)), "Completion note must be 500 characters or fewer.");
  });

  it("rejects unassigned children and disabled Completed Together submissions", () => {
    assert.throws(
      () =>
        validateAssignedParticipants({
          assignedChildIds: ["child-a"],
          completedByChildId: "child-b",
          requestedParticipantIds: [],
          completedTogether: false,
          splitPaymentEnabled: false
        }),
      /not assigned/
    );

    assert.throws(
      () =>
        validateAssignedParticipants({
          assignedChildIds: ["child-a", "child-b"],
          completedByChildId: "child-a",
          requestedParticipantIds: ["child-a", "child-b"],
          completedTogether: true,
          splitPaymentEnabled: false
        }),
      /not enabled/
    );
  });

  it("requires true multi-child participation for Completed Together", () => {
    assert.deepEqual(
      validateAssignedParticipants({
        assignedChildIds: ["child-a", "child-b"],
        completedByChildId: "child-a",
        requestedParticipantIds: ["child-b"],
        completedTogether: true,
        splitPaymentEnabled: true
      }),
      ["child-a", "child-b"]
    );

    assert.throws(
      () =>
        validateAssignedParticipants({
          assignedChildIds: ["child-a", "child-b"],
          completedByChildId: "child-a",
          requestedParticipantIds: [],
          completedTogether: true,
          splitPaymentEnabled: true
        }),
      /at least two/
    );
  });
});

describe("chore assignment rules", () => {
  it("keeps child-facing assignments limited to active children", () => {
    assert.deepEqual(
      activeAssignedChildIds({
        assignedChildIds: ["child-a", "child-a", "child-b", "child-c"],
        activeChildIds: ["child-a", "child-c"]
      }),
      ["child-a", "child-c"]
    );
  });

  it("keeps assignments unique and limited to active household children", () => {
    assert.deepEqual(
      validateChoreAssignmentIds({
        availableChildIds: ["child-a", "child-b"],
        requestedChildIds: ["child-a", "child-a", "child-b"]
      }),
      ["child-a", "child-b"]
    );
  });

  it("rejects empty, archived, or cross-household child assignments", () => {
    assert.throws(
      () =>
        validateChoreAssignmentIds({
          availableChildIds: ["child-a"],
          requestedChildIds: []
        }),
      /at least one/
    );

    assert.throws(
      () =>
        validateChoreAssignmentIds({
          availableChildIds: ["child-a"],
          requestedChildIds: ["child-b"]
        }),
      /active children/
    );
  });
});

describe("chore setting validation", () => {
  it("accepts only known schedule and shared-completion values", () => {
    assert.equal(validateChoreScheduleFrequency("daily"), "daily");
    assert.equal(validateChoreScheduleFrequency("weekly"), "weekly");
    assert.equal(validateChoreScheduleFrequency("monthly"), "monthly");
    assert.equal(validateChoreScheduleFrequency("custom"), "custom");
    assert.equal(validateSharedCompletionMode("any"), "any");
    assert.equal(validateSharedCompletionMode("all"), "all");

    assert.throws(() => validateChoreScheduleFrequency("yearly"), /valid chore schedule/);
    assert.throws(() => validateSharedCompletionMode("everyone"), /valid shared chore rule/);
  });

  it("validates chore title, description, and custom schedule text", () => {
    assert.equal(choreTitleError("  Load dishwasher  "), null);
    assert.equal(choreTitleError("   "), "Chore title is required.");
    assert.equal(choreTitleError("x".repeat(81)), "Chore title must be 80 characters or fewer.");

    assert.equal(choreDescriptionError("Helpful notes"), null);
    assert.equal(choreDescriptionError("x".repeat(501)), "Chore description must be 500 characters or fewer.");

    assert.equal(choreCustomScheduleError({ frequency: "daily", value: "anything optional" }), null);
    assert.equal(choreCustomScheduleError({ frequency: "weekly", value: "Mon, Wed, Fri" }), null);
    assert.equal(choreCustomScheduleError({ frequency: "weekly", value: "32" }), "Weekly schedules must use weekday names like Mon, Wed, Fri.");
    assert.equal(choreCustomScheduleError({ frequency: "monthly", value: "1, 15, 31" }), null);
    assert.equal(choreCustomScheduleError({ frequency: "monthly", value: "Mon" }), "Monthly schedules must use day numbers from 1 to 31.");
    assert.equal(choreCustomScheduleError({ frequency: "custom", value: "" }), "Custom schedule is required for custom chores.");
    assert.equal(choreCustomScheduleError({ frequency: "custom", value: "Tue 20" }), null);
    assert.equal(
      choreCustomScheduleError({ frequency: "custom", value: "nonday" }),
      "Custom schedules must use weekday names or day numbers from 1 to 31."
    );
    assert.equal(choreCustomScheduleError({ frequency: "custom", value: "x".repeat(121) }), "Custom schedule must be 120 characters or fewer.");
  });
});

describe("chore write failure copy", () => {
  it("explains chore save side-effect failures", () => {
    assert.equal(choreSaveFailureMessage({ target: "children", wroteRow: false }), "Active children could not be loaded for this chore.");
    assert.equal(choreSaveFailureMessage({ target: "assignments", wroteRow: false }), "Chore was saved, but assignments could not be updated.");
    assert.equal(choreSaveFailureMessage({ target: "onboarding", wroteRow: false }), "Chore was saved, but onboarding could not be updated.");
    assert.equal(choreSaveFailureMessage({ target: "notification", wroteRow: false }), "Chore was saved, but the assignment notification could not be saved.");
    assert.equal(choreSaveFailureMessage({ target: "delete", wroteRow: false }), "Chore could not be found or was already updated.");
    assert.equal(choreSaveFailureMessage({ target: "completions", wroteRow: false }), "Chore was archived, but pending completions could not be cleared.");
    assert.equal(choreSaveFailureMessage({ target: "completions", wroteRow: true }), "Chore was archived, but pending completions could not be cleared.");
  });
});

describe("split-payment rewards", () => {
  it("splits rewards evenly and assigns the cent remainder to the first child", () => {
    assert.deepEqual(
      splitRewardCents({
        rewardCents: 1001,
        participantIds: ["child-a", "child-b", "child-c"],
        splitPaymentEnabled: true
      }),
      [
        { childId: "child-a", amountCents: 335 },
        { childId: "child-b", amountCents: 333 },
        { childId: "child-c", amountCents: 333 }
      ]
    );
  });

  it("awards the full reward to the completer when splitting is disabled", () => {
    assert.deepEqual(
      splitRewardCents({
        rewardCents: 1200,
        participantIds: ["child-a", "child-b"],
        splitPaymentEnabled: false
      }),
      [
        { childId: "child-a", amountCents: 1200 },
        { childId: "child-b", amountCents: 1200 }
      ]
    );
  });

  it("splits rewards only for actual Completed Together submissions", () => {
    assert.equal(shouldSplitCompletionReward({ splitPaymentEnabled: true, completedTogether: true }), true);
    assert.equal(shouldSplitCompletionReward({ splitPaymentEnabled: true, completedTogether: false }), false);
    assert.equal(shouldSplitCompletionReward({ splitPaymentEnabled: false, completedTogether: true }), false);
  });
});

describe("chore schedule rules", () => {
  it("treats daily chores as due every day", () => {
    assert.equal(isChoreDueOn({ frequency: "daily", dueDate: "2026-06-01T12:00:00.000Z" }), true);
  });

  it("uses custom weekdays for weekly and custom schedules", () => {
    assert.equal(
      isChoreDueOn({
        frequency: "weekly",
        customSchedule: "Mon, Wed",
        dueDate: "2026-06-01T12:00:00.000Z"
      }),
      true
    );
    assert.equal(
      isChoreDueOn({
        frequency: "custom",
        customSchedule: "Tue Thu",
        dueDate: "2026-06-01T12:00:00.000Z"
      }),
      false
    );
  });

  it("falls back to created weekday or month day when no custom schedule is set", () => {
    assert.equal(
      isChoreDueOn({
        frequency: "weekly",
        createdAt: "2026-06-01T12:00:00.000Z",
        dueDate: "2026-06-08T12:00:00.000Z"
      }),
      true
    );
    assert.equal(
      isChoreDueOn({
        frequency: "monthly",
        createdAt: "2026-06-15T12:00:00.000Z",
        dueDate: "2026-07-14T12:00:00.000Z"
      }),
      false
    );
  });

  it("uses numeric month days for monthly and custom schedules", () => {
    assert.equal(
      isChoreDueOn({
        frequency: "monthly",
        customSchedule: "1, 15",
        dueDate: "2026-06-15T12:00:00.000Z"
      }),
      true
    );
    assert.equal(
      isChoreDueOn({
        frequency: "custom",
        customSchedule: "5 20",
        dueDate: "2026-06-15T12:00:00.000Z"
      }),
      false
    );
  });
});
