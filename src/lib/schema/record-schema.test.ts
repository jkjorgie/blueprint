import { describe, expect, it } from "vitest";
import type { AppSchema } from "./app-schema";
import { parseRecord, rawValues, validateRecord } from "./record-schema";

const schema: AppSchema = {
  title: "Everything",
  fields: [
    { name: "title", label: "Title", type: "text", required: true, maxLength: 10 },
    { name: "notes", label: "Notes", type: "textarea", required: false },
    { name: "qty", label: "Quantity", type: "number", required: true, min: 1, max: 5 },
    { name: "rating", label: "Rating", type: "number", required: false },
    { name: "agree", label: "Agree", type: "boolean", required: true },
    { name: "flag", label: "Flag", type: "boolean", required: false },
    { name: "when", label: "When", type: "date", required: true },
    { name: "later", label: "Later", type: "date", required: false },
    { name: "size", label: "Size", type: "select", required: true, options: ["S", "M", "L"] },
    { name: "color", label: "Color", type: "select", required: false, options: ["Red", "Blue"] },
  ],
};

const valid = {
  title: "  Hello ",
  qty: "3",
  agree: "on",
  when: "2026-09-13",
  size: "M",
};

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

describe("validateRecord", () => {
  it("accepts a valid record, trims text, converts types, and drops empty optionals", () => {
    const result = validateRecord(schema, { ...valid, notes: "   ", rating: "", later: "", color: "" });
    expect(result).toEqual({
      ok: true,
      data: { title: "Hello", qty: 3, agree: true, flag: false, when: "2026-09-13", size: "M" },
    });
  });

  it("reports every missing required field with its label", () => {
    const result = validateRecord(schema, {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual({
        title: "Title is required",
        qty: "Quantity is required",
        agree: "Agree must be checked",
        when: "When is required",
        size: "Size is required",
      });
    }
  });

  it("enforces text maxLength", () => {
    const result = validateRecord(schema, { ...valid, title: "this is far too long" });
    expect(result).toMatchObject({ ok: false, errors: { title: "Title must be 10 characters or fewer" } });
  });

  it("rejects non-numeric and out-of-range numbers", () => {
    expect(validateRecord(schema, { ...valid, qty: "abc" })).toMatchObject({
      ok: false,
      errors: { qty: "Quantity must be a number" },
    });
    expect(validateRecord(schema, { ...valid, qty: "0" })).toMatchObject({
      ok: false,
      errors: { qty: "Quantity must be at least 1" },
    });
    expect(validateRecord(schema, { ...valid, qty: "9" })).toMatchObject({
      ok: false,
      errors: { qty: "Quantity must be at most 5" },
    });
  });

  it("treats a missing optional checkbox as false and a required one as an error", () => {
    const off = validateRecord(schema, { ...valid, agree: undefined });
    expect(off).toMatchObject({ ok: false, errors: { agree: "Agree must be checked" } });
    const on = validateRecord(schema, { ...valid, flag: "on" });
    expect(on).toMatchObject({ ok: true, data: { flag: true } });
  });

  it("rejects malformed and impossible dates", () => {
    expect(validateRecord(schema, { ...valid, when: "09/13/2026" })).toMatchObject({
      ok: false,
      errors: { when: "When must be a date in YYYY-MM-DD format" },
    });
    expect(validateRecord(schema, { ...valid, when: "2026-02-30" })).toMatchObject({
      ok: false,
      errors: { when: "When must be a real date" },
    });
  });

  it("rejects select values that are not in the options", () => {
    expect(validateRecord(schema, { ...valid, size: "XL" })).toMatchObject({
      ok: false,
      errors: { size: "Size must be one of the listed options" },
    });
  });

  it("ignores keys that are not in the schema", () => {
    const result = validateRecord(schema, { ...valid, hacker: "yes" });
    expect(result.ok).toBe(true);
    if (result.ok) expect("hacker" in result.data).toBe(false);
  });
});

describe("parseRecord and rawValues", () => {
  it("reads FormData the way a browser submits it", () => {
    const fd = form({ ...valid, flag: "on", color: "Blue" });
    expect(parseRecord(schema, fd)).toEqual({
      ok: true,
      data: { title: "Hello", qty: 3, agree: true, flag: true, when: "2026-09-13", size: "M", color: "Blue" },
    });
  });

  it("echoes raw text back for re-filling the form", () => {
    const fd = form({ title: "  Hello ", qty: "abc" });
    expect(rawValues(schema, fd)).toEqual({ title: "  Hello ", qty: "abc" });
  });
});

describe("list fields", () => {
  const listSchema: AppSchema = {
    title: "Bugs",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      {
        name: "steps",
        label: "Steps",
        type: "list",
        required: true,
        itemLabel: "Step",
        minItems: 0,
        maxItems: 3,
        fields: [
          { name: "action", label: "What you did", type: "text", required: true },
          { name: "minutes", label: "Minutes", type: "number", required: false },
          { name: "blocking", label: "Blocking", type: "boolean", required: false },
        ],
      },
    ],
  };

  it("parses rows from FormData with each sub-field typed like a top-level field", () => {
    const fd = form({
      title: "Crash",
      "steps.0.action": " Open the app ",
      "steps.0.minutes": "2",
      "steps.0.blocking": "on",
      "steps.1.action": "Tap save",
      "steps.1.minutes": "",
    });
    expect(parseRecord(listSchema, fd)).toEqual({
      ok: true,
      data: {
        title: "Crash",
        steps: [
          { action: "Open the app", minutes: 2, blocking: true },
          { action: "Tap save", blocking: false },
        ],
      },
    });
  });

  it("re-indexes sparse rows densely, in ascending order", () => {
    const fd = form({
      title: "Crash",
      "steps.5.action": "third",
      "steps.0.action": "first",
      "steps.2.action": "second",
    });
    const result = parseRecord(listSchema, fd);
    expect(result.ok && result.data.steps).toEqual([
      { action: "first", blocking: false },
      { action: "second", blocking: false },
      { action: "third", blocking: false },
    ]);
  });

  it("ignores keys that are not a known sub-field at a whole-number index", () => {
    const fd = form({ title: "Crash", "steps.0.action": "first", "steps.01.action": "x", "steps.1.hacker": "x" });
    const result = parseRecord(listSchema, fd);
    expect(result.ok && result.data.steps).toEqual([{ action: "first", blocking: false }]);
  });

  it("drops rows where every sub-field is empty", () => {
    const fd = form({ title: "Crash", "steps.0.action": "  ", "steps.0.minutes": "", "steps.1.action": "kept" });
    const result = parseRecord(listSchema, fd);
    expect(result.ok && result.data.steps).toEqual([{ action: "kept", blocking: false }]);
  });

  it("keys row errors by list, dense index, and sub-field", () => {
    const fd = form({
      title: "Crash",
      "steps.0.action": "fine",
      "steps.4.minutes": "abc",
      "steps.7.minutes": "3",
    });
    expect(parseRecord(listSchema, fd)).toEqual({
      ok: false,
      errors: {
        "steps.1.action": "What you did is required",
        "steps.1.minutes": "Minutes must be a number",
        "steps.2.action": "What you did is required",
      },
    });
  });

  it("enforces required on the list itself", () => {
    expect(parseRecord(listSchema, form({ title: "Crash", "steps.0.action": "" }))).toEqual({
      ok: false,
      errors: { steps: "Steps is required" },
    });
  });

  it("does not also call a list missing when its only row has an error", () => {
    expect(parseRecord(listSchema, form({ title: "Crash", "steps.0.minutes": "2" }))).toEqual({
      ok: false,
      errors: { "steps.0.action": "What you did is required" },
    });
  });

  it("enforces minItems and maxItems against the rows that are kept", () => {
    const limited: AppSchema = {
      ...listSchema,
      fields: [{ ...(listSchema.fields[1] as Extract<AppSchema["fields"][number], { type: "list" }>), minItems: 2 }],
    };
    expect(validateRecord(limited, { steps: [{ action: "one" }, { action: "" }] })).toEqual({
      ok: false,
      errors: { steps: "Steps needs at least 2 Steps" },
    });
    const four = [1, 2, 3, 4].map((n) => ({ action: `step ${n}` }));
    expect(validateRecord(limited, { steps: four })).toEqual({
      ok: false,
      errors: { steps: "Steps can have at most 3 Steps" },
    });
  });

  it("validateRecord accepts an array directly", () => {
    const result = validateRecord(listSchema, {
      title: "Crash",
      steps: [{ action: "Open", minutes: 5, blocking: true }, { action: "" }],
    });
    expect(result).toEqual({
      ok: true,
      data: { title: "Crash", steps: [{ action: "Open", minutes: 5, blocking: true }] },
    });
  });

  it("rejects a list value that is not an array", () => {
    expect(validateRecord(listSchema, { title: "Crash", steps: "nope" })).toEqual({
      ok: false,
      errors: { steps: "Steps must be a list" },
    });
  });

  it("leaves an empty optional list out of the data", () => {
    const optional: AppSchema = {
      ...listSchema,
      fields: [
        { ...(listSchema.fields[1] as Extract<AppSchema["fields"][number], { type: "list" }>), required: false },
      ],
    };
    expect(validateRecord(optional, { steps: [] })).toEqual({ ok: true, data: {} });
  });
});
