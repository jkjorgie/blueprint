import { describe, expect, it } from "vitest";
import { STARTER_SCHEMA_JSON, parseApplicationForm, readApplicationForm, slugify } from "./application-form";

const valid = {
  name: "  Bug Reports ",
  slug: "bug-reports",
  description: "",
  schemaJson: STARTER_SCHEMA_JSON,
};

describe("slugify", () => {
  it("lowercases, replaces runs of punctuation and spaces with one hyphen, and trims hyphens", () => {
    expect(slugify("Bug Reports!")).toBe("bug-reports");
    expect(slugify("  Event   RSVPs (2026) ")).toBe("event-rsvps-2026");
    expect(slugify("---")).toBe("");
  });

  it("caps the length", () => {
    expect(slugify("a".repeat(100)).length).toBe(60);
  });
});

describe("parseApplicationForm", () => {
  it("accepts a valid form, trims the name, and turns an empty description into null", () => {
    const result = parseApplicationForm(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Bug Reports");
      expect(result.data.description).toBeNull();
      expect(result.data.schema.title).toBe("Feedback");
    }
  });

  it("reports a missing name and a bad slug together", () => {
    const result = parseApplicationForm({ ...valid, name: " ", slug: "Bug Reports" });
    expect(result).toEqual({
      ok: false,
      errors: {
        name: "Name is required.",
        slug: "Slug can only contain lowercase letters, numbers, and single hyphens.",
      },
    });
  });

  it("returns every schema error as a list", () => {
    const result = parseApplicationForm({
      ...valid,
      schemaJson: JSON.stringify({ title: "", fields: [{ name: "Bad Name", label: "", type: "text" }] }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.schema).toHaveLength(3);
      expect(result.errors.schema?.[0]).toMatch(/^title: /);
    }
  });

  it("reports malformed JSON as a single schema error", () => {
    const result = parseApplicationForm({ ...valid, schemaJson: "{ nope" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.schema).toHaveLength(1);
      expect(result.errors.schema?.[0]).toMatch(/^Invalid JSON/);
    }
  });

  it("rejects a description over 300 characters", () => {
    const result = parseApplicationForm({ ...valid, description: "x".repeat(301) });
    expect(result).toMatchObject({ ok: false, errors: { description: "Description must be 300 characters or fewer." } });
  });
});

describe("readApplicationForm", () => {
  it("reads the four fields and treats missing ones as empty strings", () => {
    const fd = new FormData();
    fd.set("name", "Feedback");
    fd.set("schemaJson", "{}");
    expect(readApplicationForm(fd)).toEqual({ name: "Feedback", slug: "", description: "", schemaJson: "{}" });
  });
});
