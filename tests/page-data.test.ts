import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requirePageData } from "../src/lib/page-data";

describe("page data guards", () => {
  it("returns loaded page data", () => {
    assert.deepEqual(requirePageData({ data: [{ id: "row" }], error: null, label: "Rows" }), [{ id: "row" }]);
  });

  it("throws query errors with safe page-data copy", () => {
    assert.throws(
      () => requirePageData({ data: [], error: { message: "permission denied" }, label: "Rows" }),
      /Rows could not be loaded/
    );
  });

  it("throws when required page data is missing", () => {
    assert.throws(() => requirePageData({ data: null, error: null, label: "Profile" }), /Profile could not be loaded/);
  });
});
