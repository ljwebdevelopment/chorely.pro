import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("child save source safeguards", () => {
  it("validates child profile fields before writing", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");
    const forms = readFileSync("src/components/forms.tsx", "utf8");

    assert.match(actions, /const name = formString\(formData, "name"\)/);
    assert.match(actions, /const avatarUrl = formString\(formData, "avatar_url"\)/);
    assert.match(actions, /const nameError = childNameError\(name\)/);
    assert.match(actions, /const avatarError = childAvatarUrlError\(avatarUrl\)/);
    assert.match(actions, /name,/);
    assert.match(actions, /avatar_url: avatarUrl \|\| null/);
    assert.doesNotMatch(actions, /name: formString\(formData, "name"\)/);
    assert.doesNotMatch(actions, /avatar_url: formString\(formData, "avatar_url"\) \|\| null/);
    assert.match(forms, /<input id="name" name="name" required maxLength=\{80\}/);
    assert.match(forms, /<input id="avatar_url" name="avatar_url" type="url" maxLength=\{500\}/);
  });
});
