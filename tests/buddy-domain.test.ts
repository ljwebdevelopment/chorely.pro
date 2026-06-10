import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buddyStage, buddyStatusMessage, dailyMotivationalMessage, reminderBody, reminderMessages } from "../src/lib/buddy-domain";
import { choreMilestones, milestoneNotificationPayloads } from "../src/lib/notification-domain";

describe("chore buddy growth", () => {
  it("maps weekly approved completions to growth stages", () => {
    assert.equal(buddyStage(0), 0);
    assert.equal(buddyStage(1), 1);
    assert.equal(buddyStage(2), 1);
    assert.equal(buddyStage(3), 2);
    assert.equal(buddyStage(5), 2);
    assert.equal(buddyStage(6), 3);
    assert.equal(buddyStage(9), 3);
    assert.equal(buddyStage(10), 4);
    assert.equal(buddyStage(25), 4);
  });

  it("describes the buddy state for watered and thirsty days", () => {
    assert.match(buddyStatusMessage({ stage: 0, wateredToday: false, weeklyApproved: 0 }), /waiting to be planted/i);
    assert.match(buddyStatusMessage({ stage: 2, wateredToday: false, weeklyApproved: 4 }), /thirsty/i);
    assert.match(buddyStatusMessage({ stage: 4, wateredToday: true, weeklyApproved: 12 }), /flourishing/i);
  });

  it("rotates motivational messages deterministically by day", () => {
    const day = new Date("2026-06-10T12:00:00Z");
    assert.equal(dailyMotivationalMessage(day), dailyMotivationalMessage(new Date("2026-06-10T20:00:00Z")));
    assert.equal(typeof dailyMotivationalMessage(day), "string");
  });

  it("builds child reminder bodies from presets or trimmed custom text", () => {
    assert.equal(reminderBody({ childName: "Mia", requested: "  Please feed the dog.  " }), "Please feed the dog.");
    assert.equal(reminderBody({ childName: "Mia", requested: "" }), reminderMessages("Mia")[0]);
    assert.equal(reminderBody({ childName: "Mia", requested: "x".repeat(300) }), reminderMessages("Mia")[0]);
    for (const message of reminderMessages("Mia")) {
      assert.match(message, /Mia/);
    }
  });
});

describe("chore milestone notifications", () => {
  const baseChore = { custom_schedule: null, created_at: "2026-06-01T00:00:00Z" };

  it("detects when every chore due today is complete", () => {
    const milestones = choreMilestones({
      chores: [
        { ...baseChore, id: "a", frequency: "daily", assignedChildIds: ["c1"] },
        { ...baseChore, id: "b", frequency: "daily", assignedChildIds: ["c1"] }
      ],
      activeChildIds: ["c1"],
      todayCompletedChoreIds: ["a", "b"],
      weeklyCompletedChoreIds: []
    });
    assert.equal(milestones.allDailyComplete, true);
    assert.equal(milestones.allWeeklyComplete, false);
  });

  it("does not celebrate while chores due today remain open", () => {
    const milestones = choreMilestones({
      chores: [
        { ...baseChore, id: "a", frequency: "daily", assignedChildIds: ["c1"] },
        { ...baseChore, id: "b", frequency: "daily", assignedChildIds: ["c1"] }
      ],
      activeChildIds: ["c1"],
      todayCompletedChoreIds: ["a"],
      weeklyCompletedChoreIds: ["a"]
    });
    assert.equal(milestones.allDailyComplete, false);
  });

  it("ignores chores assigned only to archived children", () => {
    const milestones = choreMilestones({
      chores: [
        { ...baseChore, id: "a", frequency: "daily", assignedChildIds: ["c1"] },
        { ...baseChore, id: "b", frequency: "daily", assignedChildIds: ["archived"] }
      ],
      activeChildIds: ["c1"],
      todayCompletedChoreIds: ["a"],
      weeklyCompletedChoreIds: []
    });
    assert.equal(milestones.allDailyComplete, true);
  });

  it("detects when every weekly chore is complete for the week", () => {
    const milestones = choreMilestones({
      chores: [
        { ...baseChore, id: "a", frequency: "weekly", assignedChildIds: ["c1"] },
        { ...baseChore, id: "b", frequency: "weekly", assignedChildIds: ["c1"] }
      ],
      activeChildIds: ["c1"],
      todayCompletedChoreIds: [],
      weeklyCompletedChoreIds: ["a", "b"]
    });
    assert.equal(milestones.allWeeklyComplete, true);
  });

  it("reports no milestones for empty chore lists", () => {
    const milestones = choreMilestones({
      chores: [],
      activeChildIds: ["c1"],
      todayCompletedChoreIds: [],
      weeklyCompletedChoreIds: []
    });
    assert.equal(milestones.allDailyComplete, false);
    assert.equal(milestones.allWeeklyComplete, false);
  });

  it("creates parent-friendly milestone notification payloads", () => {
    const payloads = milestoneNotificationPayloads({ allDailyComplete: true, allWeeklyComplete: true });
    assert.equal(payloads.length, 2);
    assert.equal(payloads[0].type, "all_daily_complete");
    assert.equal(payloads[1].type, "all_weekly_complete");
    const none = milestoneNotificationPayloads({ allDailyComplete: false, allWeeklyComplete: false });
    assert.equal(none.length, 0);
  });
});
