import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { centsToDollars, dollarsToCents, rewardCentsFromInput } from "../src/lib/money";

describe("money helpers", () => {
  it("formats and parses valid reward amounts", () => {
    assert.equal(centsToDollars(1234), "$12.34");
    assert.equal(dollarsToCents("12.34"), 1234);
    assert.equal(rewardCentsFromInput("12.345"), 1235);
    assert.equal(rewardCentsFromInput("0"), 0);
  });

  it("rejects invalid reward posts instead of silently creating zero-dollar chores", () => {
    assert.throws(() => rewardCentsFromInput(""), /valid amount/);
    assert.throws(() => rewardCentsFromInput("not-money"), /valid amount/);
    assert.throws(() => rewardCentsFromInput("-1"), /valid amount/);
  });
});
