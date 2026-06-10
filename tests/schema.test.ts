import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const migration = readFileSync("supabase/migrations/001_initial_schema.sql", "utf8");

describe("database completion safeguards", () => {
  it("prevents duplicate active or approved completions for the same chore due date", () => {
    assert.match(migration, /create unique index if not exists chore_completions_one_payable_per_due_day/);
    assert.match(migration, /on public\.chore_completions \(chore_id, due_on\)/);
    assert.match(migration, /where status in \('collecting', 'pending', 'approved'\)/);
  });

  it("enables row level security on household data tables", () => {
    for (const table of [
      "profiles",
      "households",
      "household_members",
      "children",
      "child_pins",
      "chores",
      "chore_assignments",
      "chore_comments",
      "chore_completions",
      "approval_events",
      "earnings_ledger",
      "notifications",
      "subscriptions",
      "onboarding_state"
    ]) {
      assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security;`));
    }
  });

  it("keeps each parent account scoped to one household", () => {
    assert.match(migration, /create unique index if not exists households_one_per_owner/);
    assert.match(migration, /on public\.households \(owner_id\)/);
  });

  it("keeps child pins and related household rows scoped to the owner household", () => {
    assert.match(migration, /create policy "child pins household owner" on public\.child_pins/);
    assert.match(migration, /join public\.households h on h\.id = c\.household_id/);
    assert.match(migration, /create policy "ledger household owner" on public\.earnings_ledger/);
    assert.match(migration, /create policy "completions household owner" on public\.chore_completions/);
  });

  it("stores chore household notes with household-scoped row level security", () => {
    assert.match(migration, /create table if not exists public\.chore_comments/);
    assert.match(migration, /kind text not null default 'household_note' check \(kind in \('household_note', 'supply_note', 'chore_issue'\)\)/);
    assert.match(migration, /alert_label text/);
    assert.match(migration, /note text not null/);
    assert.match(migration, /read_at timestamptz/);
    assert.match(migration, /create policy "chore comments household owner" on public\.chore_comments/);
    assert.match(migration, /join public\.households h on h\.id = ch\.household_id/);
  });
});
