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

describe("list fields", () => {
  const steps = {
    name: "steps",
    label: "Steps to reproduce",
    type: "list",
    fields: [
      { name: "action", label: "What you did", type: "text", required: true },
      { name: "blocking", label: "Blocks testing", type: "boolean" },
    ],
  };

  function withList(list: Record<string, unknown>) {
    return { title: "Bugs", fields: [{ name: "title", label: "Title", type: "text" }, list] };
  }

  it("accepts a list of scalar sub-fields and fills in its defaults", () => {
    const result = parseAppSchema(withList(steps));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.schema.fields[1]).toMatchObject({
        type: "list",
        required: false,
        itemLabel: "Item",
        minItems: 0,
        maxItems: 20,
        fields: [{ name: "action" }, { name: "blocking", required: false }],
      });
    }
  });

  it("keeps an explicit itemLabel and item limits", () => {
    const result = parseAppSchema(withList({ ...steps, itemLabel: "Step", minItems: 1, maxItems: 5 }));
    expect(result.ok && result.schema.fields[1]).toMatchObject({ itemLabel: "Step", minItems: 1, maxItems: 5 });
  });

  it("rejects a list inside a list", () => {
    const result = parseAppSchema(withList({ ...steps, fields: [{ ...steps, name: "inner" }] }));
    expect(result).toEqual({ ok: false, errors: ["fields.1.fields.0.type: a list cannot contain another list"] });
  });

  it("rejects duplicate sub-field names within a list", () => {
    const result = parseAppSchema(
      withList({ ...steps, fields: [...steps.fields, { name: "action", label: "Again", type: "textarea" }] }),
    );
    expect(result).toEqual({ ok: false, errors: ['fields.1.fields.2.name: duplicate field name "action"'] });
  });

  it("allows a sub-field to share a name with a top-level field", () => {
    const result = parseAppSchema(withList({ ...steps, fields: [{ name: "title", label: "Title", type: "text" }] }));
    expect(result.ok).toBe(true);
  });

  it("rejects minItems greater than maxItems", () => {
    const result = parseAppSchema(withList({ ...steps, minItems: 6, maxItems: 5 }));
    expect(result).toEqual({ ok: false, errors: ["fields.1.minItems: minItems cannot be more than maxItems"] });
  });

  it("rejects a list with no sub-fields or out-of-range limits", () => {
    expect(parseAppSchema(withList({ ...steps, fields: [] }))).toEqual({
      ok: false,
      errors: ["fields.1.fields: list fields need at least one sub-field"],
    });
    expect(parseAppSchema(withList({ ...steps, maxItems: 51 }))).toEqual({
      ok: false,
      errors: ["fields.1.maxItems: maxItems must be 50 or fewer"],
    });
    expect(parseAppSchema(withList({ ...steps, itemLabel: "x".repeat(41) }))).toEqual({
      ok: false,
      errors: ["fields.1.itemLabel: itemLabel must be 40 characters or fewer"],
    });
  });
});
