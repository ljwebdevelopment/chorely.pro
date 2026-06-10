import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("shared type source safeguards", () => {
  it("uses chore-domain as the single source for chore schedule and sharing unions", () => {
    const typesSource = readFileSync("src/lib/types.ts", "utf8");

    assert.match(typesSource, /import type \{ ChoreScheduleFrequency, SharedCompletionMode \} from "@\/lib\/chore-domain"/);
    assert.match(typesSource, /export type ScheduleFrequency = ChoreScheduleFrequency/);
    assert.doesNotMatch(typesSource, /export type ScheduleFrequency = "daily"/);
    assert.doesNotMatch(typesSource, /export type SharedCompletionMode = "any"/);
    assert.doesNotMatch(typesSource, /export type CompletionStatus =/);
    assert.doesNotMatch(typesSource, /export type LedgerStatus =/);
  });
});
