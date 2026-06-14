import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("chore reward source safeguards", () => {
  it("validates reward and chore settings before writing chores", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");
    const forms = readFileSync("src/components/forms.tsx", "utf8");

    assert.match(actions, /let rewardCents: number/);
    assert.match(actions, /rewardCents = rewardCentsFromInput\(formData\.get\("reward"\)\)/);
    assert.match(actions, /const title = formString\(formData, "title"\)\.trim\(\)/);
    assert.match(actions, /const titleError = choreTitleError\(title\)/);
    assert.match(actions, /const descriptionError = choreDescriptionError\(description\)/);
    assert.match(actions, /validateChoreScheduleFrequency\(formString\(formData, "frequency", "daily"\)\)/);
    assert.match(actions, /validateSharedCompletionMode\(formString\(formData, "shared_completion_mode", "any"\)\)/);
    assert.match(actions, /choreCustomScheduleError\(\{ frequency, value: customSchedule \}\)/);
    assert.match(actions, /title,/);
    assert.match(actions, /description: description \|\| null/);
    assert.match(actions, /custom_schedule: customSchedule \|\| null/);
    assert.match(actions, /reward_cents: rewardCents/);
    assert.match(actions, /frequency,/);
    assert.match(actions, /shared_completion_mode: sharedCompletionMode/);
    assert.doesNotMatch(actions, /title: formString\(formData, "title"\)/);
    assert.doesNotMatch(actions, /description: formString\(formData, "description"\) \|\| null/);
    assert.doesNotMatch(actions, /custom_schedule: formString\(formData, "custom_schedule"\) \|\| null/);
    assert.doesNotMatch(actions, /reward_cents: dollarsToCents\(formData\.get\("reward"\)\)/);
    assert.doesNotMatch(actions, /frequency: formString\(formData, "frequency", "daily"\)/);
    assert.doesNotMatch(actions, /shared_completion_mode: formString\(formData, "shared_completion_mode", "any"\)/);
    assert.match(forms, /<input id="title" name="title" required maxLength=\{80\}/);
    assert.match(forms, /<textarea id="description" name="description" maxLength=\{500\}/);
    assert.match(forms, /id="custom_schedule"[\s\S]*?name="custom_schedule"[\s\S]*?maxLength=\{120\}/);
  });

  it("uses semantic checkbox groups for shared chore assignments and explains Completed Together", () => {
    const forms = readFileSync("src/components/forms.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");

    assert.match(forms, /Completed Together is automatic/);
    assert.doesNotMatch(forms, /name="split_payment_enabled"/);
    assert.match(forms, /<fieldset className="field full checkbox-group">[\s\S]*?<legend>Assign children<\/legend>/);
    assert.match(forms, /htmlFor=\{`child_ids_\$\{child\.id\}`\}[\s\S]*?id=\{`child_ids_\$\{child\.id\}`\}/);
    assert.match(css, /fieldset\.field \{[\s\S]*?border: 0;[\s\S]*?padding: 0;/);
    assert.match(css, /label,[\s\S]*?legend \{[\s\S]*?font-weight: 750;/);
  });
});
