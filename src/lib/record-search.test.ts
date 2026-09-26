// Unit tests for the response search rules. Pure functions, no database.
import { describe, expect, it } from "vitest";
import type { AppSchema } from "@/lib/schema/app-schema";
import { describeMatches, normalizeQuery, searchRecords } from "./record-search";

// One field of each kind the search must treat differently: two searchable
// (text, textarea) and three that must be ignored (select, number, boolean).
const schema: AppSchema = {
  title: "Bug Reports",
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: false },
    { name: "severity", label: "Severity", type: "select", required: true, options: ["Low", "High"] },
    { name: "count", label: "Count", type: "number", required: false },
    { name: "reproducible", label: "Reproducible", type: "boolean", required: false },
  ],
};

const safari = {
  id: "r1",
  data: { title: "Save button does nothing on Safari", description: "Profile page.", severity: "High", count: 17 },
};
const typo = {
  id: "r2",
  data: { title: "Typo on the welcome banner", description: "Welcom should be Welcome.", severity: "Low" },
};
// No description at all, as for a response saved before that field existed.
const sparse = { id: "r3", data: { title: "Checkout hangs", severity: "High" } };

const all = [safari, typo, sparse];
const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

describe("searchRecords", () => {
  it("matches a text field regardless of case", () => {
    expect(ids(searchRecords(schema, all, "safari"))).toEqual(["r1"]);
    expect(ids(searchRecords(schema, all, "SAFARI"))).toEqual(["r1"]);
    expect(ids(searchRecords(schema, all, "SaFaRi"))).toEqual(["r1"]);
  });

  it("matches inside a textarea field, not just at the start", () => {
    expect(ids(searchRecords(schema, all, "welcom"))).toEqual(["r2"]);
  });

  it("returns every row that matches, in the order given", () => {
    // "on" appears in both r1 ("nothing on Safari") and r2 ("Typo on").
    expect(ids(searchRecords(schema, all, "on"))).toEqual(["r1", "r2"]);
  });

  it("ignores select, number, and boolean fields", () => {
    // "High" is r1's and r3's severity, a select. It must not count.
    expect(searchRecords(schema, all, "high")).toEqual([]);
    // 17 is r1's count, a number.
    expect(searchRecords(schema, all, "17")).toEqual([]);
  });

  it("does not match a missing value", () => {
    // r3 has no description. The string "undefined" must not be searchable.
    expect(searchRecords(schema, all, "undefined")).toEqual([]);
  });

  it("returns nothing when nothing matches", () => {
    expect(searchRecords(schema, all, "banana")).toEqual([]);
  });

  it("skips rows whose data is not an object", () => {
    const broken = [{ id: "x", data: null }, { id: "y", data: "Safari" }];
    expect(searchRecords(schema, broken, "safari")).toEqual([]);
  });
});

describe("normalizeQuery", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeQuery("  safari  ")).toBe("safari");
  });

  it("treats blank and missing queries as no search", () => {
    expect(normalizeQuery("")).toBe("");
    expect(normalizeQuery("   ")).toBe("");
    expect(normalizeQuery(undefined)).toBe("");
  });

  it("takes the first value when the key is repeated", () => {
    expect(normalizeQuery(["safari", "typo"])).toBe("safari");
  });
});

describe("describeMatches", () => {
  it("uses the right wording for none, one, and many", () => {
    expect(describeMatches(0, "banana")).toBe("No responses match 'banana'");
    expect(describeMatches(1, "safari")).toBe("1 response matches 'safari'");
    expect(describeMatches(3, "on")).toBe("3 responses match 'on'");
  });
});
