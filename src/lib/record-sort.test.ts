// Unit tests for the response sort rules. Pure functions, no database.
import { describe, expect, it } from "vitest";
import type { AppSchema } from "@/lib/schema/app-schema";
import { SUBMITTED, nextSort, normalizeSort, sortHref, sortRecords, type Sort } from "./record-sort";

// One field of every type, so each comparison rule has something to sort.
const schema: AppSchema = {
  title: "Mixed",
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "notes", label: "Notes", type: "textarea", required: false },
    { name: "severity", label: "Severity", type: "select", required: false, options: ["Low", "High"] },
    { name: "count", label: "Count", type: "number", required: false },
    { name: "done", label: "Done", type: "boolean", required: false },
    { name: "due", label: "Due", type: "date", required: false },
  ],
};

type Row = { id: string; data: Record<string, unknown>; createdAt: Date };
const row = (id: string, data: Record<string, unknown>, day = 1): Row => ({
  id,
  data,
  createdAt: new Date(`2026-09-${String(day).padStart(2, "0")}T10:00:00`),
});

const ids = (rows: { id: string }[]) => rows.map((r) => r.id);
const by = (field: string, dir: Sort["dir"] = "asc"): Sort => ({ field, dir });

describe("normalizeSort", () => {
  it("accepts a real field name with asc or desc", () => {
    expect(normalizeSort("title", "asc", schema)).toEqual({ field: "title", dir: "asc" });
    expect(normalizeSort("count", "desc", schema)).toEqual({ field: "count", dir: "desc" });
  });

  it("accepts the Submitted column", () => {
    expect(normalizeSort("submitted", "desc", schema)).toEqual({ field: SUBMITTED, dir: "desc" });
  });

  it("rejects an unknown field", () => {
    expect(normalizeSort("nope", "asc", schema)).toBeNull();
  });

  it("rejects a missing or invalid direction", () => {
    expect(normalizeSort("title", undefined, schema)).toBeNull();
    expect(normalizeSort("title", "up", schema)).toBeNull();
    // Case matters: only the exact values the links produce are accepted.
    expect(normalizeSort("title", "ASC", schema)).toBeNull();
  });

  it("rejects a missing or empty field", () => {
    expect(normalizeSort(undefined, "asc", schema)).toBeNull();
    expect(normalizeSort("", "asc", schema)).toBeNull();
  });

  it("does not match field names case-insensitively", () => {
    expect(normalizeSort("Title", "asc", schema)).toBeNull();
  });

  it("takes the first value when a key is repeated", () => {
    expect(normalizeSort(["title", "count"], ["desc", "asc"], schema)).toEqual({ field: "title", dir: "desc" });
  });
});

describe("sortRecords", () => {
  describe("number fields", () => {
    const rows = [
      row("ten", { count: 10 }),
      row("nine", { count: 9 }),
      row("one", { count: 1 }),
      row("zero", { count: 0 }),
    ];

    it("sorts numerically, not as text", () => {
      // As text, "10" would sort before "9".
      expect(ids(sortRecords(schema, rows, by("count")))).toEqual(["zero", "one", "nine", "ten"]);
    });

    it("reverses for desc", () => {
      expect(ids(sortRecords(schema, rows, by("count", "desc")))).toEqual(["ten", "nine", "one", "zero"]);
    });

    it("sorts a numeric string from older data as a number", () => {
      const mixed = [row("a", { count: "10" }), row("b", { count: 9 })];
      expect(ids(sortRecords(schema, mixed, by("count")))).toEqual(["b", "a"]);
    });
  });

  describe("date fields", () => {
    const rows = [
      row("oct", { due: "2026-10-01" }),
      row("jan", { due: "2026-01-15" }),
      row("sep", { due: "2026-09-30" }),
    ];

    it("sorts chronologically", () => {
      expect(ids(sortRecords(schema, rows, by("due")))).toEqual(["jan", "sep", "oct"]);
    });

    it("reverses for desc", () => {
      expect(ids(sortRecords(schema, rows, by("due", "desc")))).toEqual(["oct", "sep", "jan"]);
    });
  });

  describe("boolean fields", () => {
    const rows = [row("yes", { done: true }), row("no", { done: false })];

    it("puts false before true", () => {
      expect(ids(sortRecords(schema, rows, by("done")))).toEqual(["no", "yes"]);
    });

    it("puts true first for desc", () => {
      expect(ids(sortRecords(schema, rows, by("done", "desc")))).toEqual(["yes", "no"]);
    });
  });

  describe("text, textarea, and select fields", () => {
    it("sorts text alphabetically, ignoring case", () => {
      const rows = [row("b", { title: "banana" }), row("A", { title: "Apple" }), row("c", { title: "cherry" })];
      expect(ids(sortRecords(schema, rows, by("title")))).toEqual(["A", "b", "c"]);
    });

    it("treats values that differ only in case as equal, keeping their order", () => {
      const rows = [row("lower", { title: "apple" }), row("upper", { title: "APPLE" })];
      expect(ids(sortRecords(schema, rows, by("title")))).toEqual(["lower", "upper"]);
    });

    it("sorts a textarea the same way", () => {
      const rows = [row("z", { notes: "zebra" }), row("a", { notes: "Aardvark" })];
      expect(ids(sortRecords(schema, rows, by("notes")))).toEqual(["a", "z"]);
    });

    it("sorts a select by its option text", () => {
      const rows = [row("low", { severity: "Low" }), row("high", { severity: "High" })];
      expect(ids(sortRecords(schema, rows, by("severity")))).toEqual(["high", "low"]);
      expect(ids(sortRecords(schema, rows, by("severity", "desc")))).toEqual(["low", "high"]);
    });
  });

  describe("missing values", () => {
    it("sort last in ascending order", () => {
      const rows = [row("none", {}), row("two", { count: 2 }), row("one", { count: 1 })];
      expect(ids(sortRecords(schema, rows, by("count")))).toEqual(["one", "two", "none"]);
    });

    it("still sort last in descending order", () => {
      const rows = [row("none", {}), row("one", { count: 1 }), row("two", { count: 2 })];
      expect(ids(sortRecords(schema, rows, by("count", "desc")))).toEqual(["two", "one", "none"]);
    });

    it("treat null, empty text, and unusable values as missing", () => {
      const rows = [row("null", { title: null }), row("empty", { title: "" }), row("real", { title: "Bug" })];
      expect(ids(sortRecords(schema, rows, by("title")))[0]).toBe("real");

      const numbers = [row("text", { count: "lots" }), row("real", { count: 3 })];
      expect(ids(sortRecords(schema, numbers, by("count")))).toEqual(["real", "text"]);
    });
  });

  describe("the Submitted column", () => {
    const rows = [row("mid", {}, 15), row("old", {}, 1), row("new", {}, 28)];

    it("sorts by createdAt ascending", () => {
      expect(ids(sortRecords(schema, rows, by(SUBMITTED)))).toEqual(["old", "mid", "new"]);
    });

    it("sorts by createdAt descending", () => {
      expect(ids(sortRecords(schema, rows, by(SUBMITTED, "desc")))).toEqual(["new", "mid", "old"]);
    });
  });

  it("does not mutate the input", () => {
    const rows = [row("b", { count: 2 }), row("a", { count: 1 })];
    const before = ids(rows);
    const sorted = sortRecords(schema, rows, by("count"));

    expect(ids(rows)).toEqual(before);
    expect(sorted).not.toBe(rows);
  });

  it("keeps the incoming order for ties", () => {
    // Incoming order is newest first, as loaded from the database.
    const rows = [
      row("first", { severity: "High" }),
      row("second", { severity: "High" }),
      row("third", { severity: "High" }),
    ];
    expect(ids(sortRecords(schema, rows, by("severity")))).toEqual(["first", "second", "third"]);
  });

  it("returns a copy in the original order when there is no sort", () => {
    const rows = [row("b", {}), row("a", {})];
    const result = sortRecords(schema, rows, null);
    expect(ids(result)).toEqual(["b", "a"]);
    expect(result).not.toBe(rows);
  });

  it("leaves the order alone for a field that is not in the schema", () => {
    const rows = [row("b", { nope: 1 }), row("a", { nope: 2 })];
    expect(ids(sortRecords(schema, rows, by("nope")))).toEqual(["b", "a"]);
  });
});

describe("nextSort", () => {
  it("starts a new column ascending", () => {
    expect(nextSort(null, "title")).toEqual({ field: "title", dir: "asc" });
    expect(nextSort(by("count", "desc"), "title")).toEqual({ field: "title", dir: "asc" });
  });

  it("flips the direction of the active column", () => {
    expect(nextSort(by("title", "asc"), "title")).toEqual({ field: "title", dir: "desc" });
    expect(nextSort(by("title", "desc"), "title")).toEqual({ field: "title", dir: "asc" });
  });
});

describe("sortHref", () => {
  it("carries the search along with the sort", () => {
    expect(sortHref("/apps/a1/responses", "on", by("title"))).toBe("/apps/a1/responses?q=on&sort=title&dir=asc");
  });

  it("leaves out an empty search", () => {
    expect(sortHref("/apps/a1/responses", "", by("count", "desc"))).toBe("/apps/a1/responses?sort=count&dir=desc");
  });

  it("encodes a search with spaces and symbols", () => {
    const href = sortHref("/apps/a1/responses", "save & quit", by("title"));
    expect(new URL(href, "http://x").searchParams.get("q")).toBe("save & quit");
  });
});

describe("sortRecords with a list field", () => {
  const listSchema: AppSchema = {
    title: "Bugs",
    fields: [
      {
        name: "steps",
        label: "Steps",
        type: "list",
        required: false,
        itemLabel: "Step",
        minItems: 0,
        maxItems: 20,
        fields: [{ name: "action", label: "Action", type: "text", required: true }],
      },
    ],
  };
  const items = (n: number) => Array.from({ length: n }, (_, i) => ({ action: `step ${i}` }));
  const rows = [
    row("none", {}),
    row("three", { steps: items(3) }),
    row("empty", { steps: [] }),
    row("one", { steps: items(1) }),
    row("junk", { steps: "lots" }),
    row("ten", { steps: items(10) }),
  ];

  it("sorts by item count, numerically", () => {
    expect(ids(sortRecords(listSchema, rows, by("steps")))).toEqual(["one", "three", "ten", "none", "empty", "junk"]);
  });

  it("keeps missing, empty, and unusable lists last when descending", () => {
    expect(ids(sortRecords(listSchema, rows, by("steps", "desc")))).toEqual([
      "ten",
      "three",
      "one",
      "none",
      "empty",
      "junk",
    ]);
  });
});
