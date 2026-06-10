import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("chore comment source safeguards", () => {
  it("saves chore comments as household history and refreshes chore card surfaces", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.match(actions, /export async function saveChoreCommentAction\(formData: FormData\)/);
    assert.match(actions, /choreCommentTextError\(noteText\)/);
    assert.match(actions, /\.from\("chores"\)[\s\S]*?\.eq\("household_id", context\.household\.id\)[\s\S]*?\.eq\("active", true\)/);
    assert.match(actions, /\.from\("chore_comments"\)[\s\S]*?\.insert\(\{[\s\S]*?chore_id: chore\.id,[\s\S]*?household_id: context\.household\.id,[\s\S]*?kind,[\s\S]*?alert_label: alertLabel,[\s\S]*?note: noteText/);
    assert.match(actions, /type: "chore_comment"/);
    assert.match(actions, /revalidatePath\("\/chores"\)/);
    assert.match(actions, /revalidatePath\("\/dashboard"\)/);
    assert.match(actions, /revalidatePath\("\/child"\)/);
    assert.match(actions, /revalidatePath\("\/notifications"\)/);
  });

  it("lets households clear the new-note indicator without touching other households", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");
    const panel = readFileSync("src/components/chore-comments.tsx", "utf8");

    assert.match(actions, /export async function markChoreCommentReadAction\(formData: FormData\)/);
    assert.match(actions, /\.from\("chore_comments"\)[\s\S]*?\.update\(\{ read_at: new Date\(\)\.toISOString\(\) \}\)[\s\S]*?\.eq\("id", commentId\)[\s\S]*?\.eq\("household_id", context\.household\.id\)/);
    assert.match(actions, /redirect\(`\$\{source\}\?comment=read`\)/);
    assert.match(panel, /markChoreCommentReadAction/);
    assert.match(panel, /<button className="ghost-button" type="submit">[\s\S]*?Mark note read/);
  });

  it("renders add-note controls, quick supply alerts, and latest notes on parent chore cards", () => {
    const panel = readFileSync("src/components/chore-comments.tsx", "utf8");
    const choresPage = readFileSync("src/app/(app)/chores/page.tsx", "utf8");
    const dashboardPage = readFileSync("src/app/(app)/dashboard/page.tsx", "utf8");
    const childPage = readFileSync("src/app/(app)/child/page.tsx", "utf8");

    assert.match(panel, /saveChoreCommentAction/);
    assert.match(panel, /source: "\/chores" \| "\/dashboard" \| "\/child"/);
    assert.match(panel, /canMarkRead\?: boolean/);
    assert.match(panel, /hasFreshIssue && canMarkRead/);
    assert.match(panel, /<label htmlFor=\{`note-\$\{sourceSlug\}-\$\{choreId\}`\}>Add Note<\/label>/);
    assert.match(panel, /Quick supply alerts/);
    assert.match(panel, /choreCommentAlertOptions\.map/);
    assert.match(panel, /New household note/);
    assert.match(choresPage, /\.from\("chore_comments"\)[\s\S]*?\.select\("id,chore_id,kind,alert_label,note,read_at,created_at"\)/);
    assert.match(choresPage, /latestCommentByChore\.set\(comment\.chore_id, comment\)/);
    assert.match(choresPage, /<ChoreCommentPanel choreId=\{chore\.id\} source="\/chores" latestComment=\{latestCommentByChore\.get\(chore\.id\)\} \/>/);
    assert.match(dashboardPage, /<ChoreCommentPanel choreId=\{chore\.id\} source="\/dashboard" latestComment=\{latestCommentByChore\.get\(chore\.id\)\} \/>/);
    assert.match(childPage, /\.from\("chore_comments"\)[\s\S]*?\.select\("id,chore_id,kind,alert_label,note,read_at,created_at"\)/);
    assert.match(childPage, /<ChoreCommentPanel choreId=\{chore\.id\} source="\/child" latestComment=\{latestCommentByChore\.get\(chore\.id\)\} canMarkRead=\{false\} \/>/);
  });

  it("shows saved chore notes as parent-visible chore history on the edit page", () => {
    const editPage = readFileSync("src/app/(app)/chores/[id]/edit/page.tsx", "utf8");

    assert.match(editPage, /\.from\("chore_comments"\)[\s\S]*?\.select\("id,kind,alert_label,note,read_at,created_at"\)[\s\S]*?\.eq\("chore_id", id\)[\s\S]*?\.eq\("household_id", householdId\)[\s\S]*?\.order\("created_at", \{ ascending: false \}\)/);
    assert.match(editPage, /label: "Chore note history"/);
    assert.match(editPage, /<h2>Chore note history<\/h2>/);
    assert.match(editPage, /choreCommentKindLabel\(comment\.kind\)/);
    assert.match(editPage, /markChoreCommentReadAction/);
    assert.match(editPage, /value=\{`\/chores\/\$\{chore\.id\}\/edit`\}/);
  });
});
