import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { childReportStats, householdCompletionStats, mostCompletedChore, pendingEarningsCents, weeklyActivityStats } from "../src/lib/report-domain";

const completions = [
  {
    status: "approved",
    chore_id: "chore-a",
    participant_child_ids: ["child-a", "child-b"],
    completed_by_child_id: "child-a"
  },
  {
    status: "approved",
    chore_id: "chore-a",
    participant_child_ids: ["child-a"],
    completed_by_child_id: "child-a"
  },
  {
    status: "pending",
    chore_id: "chore-b",
    participant_child_ids: ["child-b"],
    completed_by_child_id: "child-b"
  }
];

describe("report calculations", () => {
  it("calculates household completion percentage and most completed chore", () => {
    assert.deepEqual(householdCompletionStats(completions), {
      totalCompletions: 3,
      approvedCompletions: 2,
      completionPercentage: 67
    });
    assert.deepEqual(
      mostCompletedChore(
        [
          { id: "chore-a", title: "Kitchen" },
          { id: "chore-b", title: "Bedroom" }
        ],
        completions
      ),
      { title: "Kitchen", count: 2 }
    );
    assert.equal(mostCompletedChore([{ id: "chore-c", title: "Laundry" }], completions), null);
  });

  it("calculates child performance from participation, not household totals", () => {
    const ledger = [
      { child_id: "child-a", amount_cents: 500 },
      { child_id: "child-b", amount_cents: 250 }
    ];

    assert.deepEqual(childReportStats({ childId: "child-a", completions, ledger }), {
      approvedCompletions: 2,
      earnedCents: 500
    });
    assert.deepEqual(childReportStats({ childId: "child-b", completions, ledger }), {
      approvedCompletions: 1,
      earnedCents: 250
    });
  });

  it("calculates pending earnings from the payouts approval would create", () => {
    assert.equal(
      pendingEarningsCents([
        {
          status: "pending",
          completed_together: true,
          participant_child_ids: ["child-a", "child-b"],
          completed_by_child_id: "child-a",
          chore: { reward_cents: 1200, split_payment_enabled: true }
        },
        {
          status: "pending",
          completed_together: false,
          participant_child_ids: ["child-a", "child-b"],
          completed_by_child_id: "child-a",
          chore: { reward_cents: 500, split_payment_enabled: false }
        },
        {
          status: "rejected",
          participant_child_ids: ["child-c"],
          completed_by_child_id: "child-c",
          chore: { reward_cents: 999, split_payment_enabled: false }
        }
      ]),
      2200
    );
  });

  it("summarizes activity from the last seven days", () => {
    assert.deepEqual(
      weeklyActivityStats(
        [
          { status: "approved", chore_id: "chore-a", completed_at: "2026-06-01T12:00:00.000Z" },
          { status: "pending", chore_id: "chore-b", completed_at: "2026-05-31T12:00:00.000Z" },
          { status: "redo_requested", chore_id: "chore-c", completed_at: "2026-05-30T12:00:00.000Z" },
          { status: "rejected", chore_id: "chore-d", completed_at: "2026-05-20T12:00:00.000Z" },
          { status: "approved", chore_id: "chore-e", completed_at: null }
        ],
        new Date("2026-06-02T12:00:00.000Z")
      ),
      { submitted: 3, approved: 1, pending: 1, redoRequested: 1, rejected: 0 }
    );
  });
});
