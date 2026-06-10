import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function actionSource(source: string, actionName: string) {
  const start = source.indexOf(`export async function ${actionName}`);
  assert.notEqual(start, -1, `${actionName} should exist`);
  const next = source.indexOf("\nexport async function ", start + 1);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

describe("note validation source safeguards", () => {
  it("validates child completion and parent review notes before writes", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");
    const childPage = readFileSync("src/app/(app)/child/page.tsx", "utf8");
    const completeChore = actionSource(actions, "completeChoreAction");
    const reviewCompletion = actionSource(actions, "reviewCompletionAction");

    assert.match(completeChore, /const note = formString\(formData, "note"\)/);
    assert.match(completeChore, /const noteError = completionNoteError\(note\)/);
    assert.match(completeChore, /redirect\(`\/child\?error=\$\{encodeURIComponent\(noteError\)\}`\)/);
    assert.match(completeChore, /note: note \|\| null/);
    assert.doesNotMatch(completeChore, /note: formString\(formData, "note"\) \|\| null/);

    assert.match(reviewCompletion, /const note = formString\(formData, "note"\) \|\| null/);
    assert.match(reviewCompletion, /const noteError = approvalNoteError\(note \|\| ""\)/);
    assert.match(reviewCompletion, /message: noteError/);
    assert.match(reviewCompletion, /insert\(\{ completion_id: completionId, action, note, actor_id: context\.user\.id \}\)/);

    assert.match(childPage, /<textarea id=\{`note-\$\{chore\.id\}`\} name="note" maxLength=\{500\} \/>/);
  });
});
