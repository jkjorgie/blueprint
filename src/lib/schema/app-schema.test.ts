import { describe, expect, it } from "vitest";
import { parseAppSchema, parseAppSchemaJson } from "./app-schema";

const valid = {
  title: "Bug Reports",
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "severity", label: "Severity", type: "select", options: ["Low", "High"] },
    { name: "reported_on", label: "Reported on", type: "date" },
  ],
};

describe("parseAppSchema", () => {
  it("accepts a valid schema and fills in defaults", () => {
    const result = parseAppSchema(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.schema.fields[1].required).toBe(false);
    }
  });

  it("rejects an empty field list", () => {
    const result = parseAppSchema({ title: "Empty", fields: [] });
    expect(result).toEqual({ ok: false, errors: ["fields: at least one field is required"] });
  });

  it("rejects field names that are not identifiers", () => {
    const result = parseAppSchema({
      title: "Bad",
      fields: [{ name: "First Name", label: "First name", type: "text" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/^fields\.0\.name: /);
    }
  });

  it("rejects duplicate field names", () => {
    const result = parseAppSchema({
      title: "Dupes",
      fields: [
        { name: "a", label: "A", type: "text" },
        { name: "a", label: "A again", type: "number" },
      ],
    });
    expect(result).toEqual({ ok: false, errors: ['fields.1.name: duplicate field name "a"'] });
  });

  it("requires options on select fields", () => {
    const result = parseAppSchema({
      title: "Select",
      fields: [{ name: "choice", label: "Choice", type: "select", options: [] }],
    });
    expect(result).toEqual({ ok: false, errors: ["fields.0.options: select fields need at least one option"] });
  });

  it("rejects unknown field types", () => {
    const result = parseAppSchema({
      title: "Unknown",
      fields: [{ name: "x", label: "X", type: "color" }],
    });
    expect(result.ok).toBe(false);
  });
});

describe("parseAppSchemaJson", () => {
  it("reports malformed JSON without throwing", () => {
    const result = parseAppSchemaJson("{ not json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/^Invalid JSON: /);
    }
  });

  it("parses valid JSON text", () => {
    expect(parseAppSchemaJson(JSON.stringify(valid)).ok).toBe(true);
  });
});
