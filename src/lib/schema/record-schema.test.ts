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
