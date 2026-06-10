import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const css = readFileSync("src/app/globals.css", "utf8");

describe("responsive layout safeguards", () => {
  it("keeps the mobile app shell navigation compact and horizontally scrollable", () => {
    assert.match(css, /@media \(max-width: 900px\) \{[\s\S]*?\.app-shell \{[\s\S]*?grid-template-columns: 1fr;/);
    assert.match(
      css,
      /@media \(max-width: 900px\) \{[\s\S]*?\.sidebar nav \{[\s\S]*?display: flex;[\s\S]*?overflow-x: auto;[\s\S]*?scrollbar-width: thin;/
    );
    assert.match(css, /@media \(max-width: 900px\) \{[\s\S]*?\.sidebar a \{[\s\S]*?flex: 0 0 auto;[\s\S]*?white-space: nowrap;/);
  });

  it("keeps keyboard focus visible across links, buttons, and form controls", () => {
    assert.match(css, /button:focus-visible,[\s\S]*?a:focus-visible,[\s\S]*?input:focus-visible,[\s\S]*?select:focus-visible,[\s\S]*?textarea:focus-visible/);
    assert.match(css, /outline: 3px solid rgba\(111, 143, 114, 0\.42\);/);
    assert.match(css, /outline-offset: 3px;/);
    assert.match(css, /input:focus-visible,[\s\S]*?select:focus-visible,[\s\S]*?textarea:focus-visible[\s\S]*?border-color: var\(--green\);/);
  });
});
