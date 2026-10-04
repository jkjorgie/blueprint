import { describe, expect, it } from "vitest";
import { STARTER_SCHEMA_JSON, parseApplicationForm, readApplicationForm, slugify } from "./application-form";

const valid = {
  name: "  Bug Reports ",
  slug: "bug-reports",
  description: "",
  schemaJson: STARTER_SCHEMA_JSON,
  customCss: "",
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
    expect(result).toMatchObject({
      ok: false,
      errors: { description: "Description must be 300 characters or fewer." },
    });
  });
});

describe("custom CSS", () => {
  const css = "h1 { color: #1e4fcf; }\n.btn-primary { background: #0b7a4b; }";

  it("passes ordinary CSS through unchanged", () => {
    const result = parseApplicationForm({ ...valid, customCss: css });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.customCss).toBe(css);
  });

  it("keeps CSS that uses > and other characters HTML would escape", () => {
    const tricky = 'a > span::after { content: "<3"; }';
    const result = parseApplicationForm({ ...valid, customCss: tricky });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.customCss).toBe(tricky);
  });

  it("turns empty or whitespace-only CSS into null", () => {
    for (const blank of ["", "   \n\t  "]) {
      const result = parseApplicationForm({ ...valid, customCss: blank });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.customCss).toBeNull();
    }
  });

  it("rejects CSS containing </ anywhere", () => {
    const attack = "h1 { color: red } </style><script>alert(1)</script>";
    const result = parseApplicationForm({ ...valid, customCss: attack });
    expect(result).toEqual({ ok: false, errors: { customCss: 'CSS cannot contain the sequence "</".' } });
  });

  it("rejects </ even mid-rule, not only as a closing style tag", () => {
    const result = parseApplicationForm({ ...valid, customCss: "a::after { content: '</' }" });
    expect(result).toMatchObject({ ok: false, errors: { customCss: expect.stringContaining("</") } });
  });

  it("accepts exactly 20,000 characters and rejects one more", () => {
    const atLimit = "a".repeat(20_000);
    expect(parseApplicationForm({ ...valid, customCss: atLimit }).ok).toBe(true);

    const result = parseApplicationForm({ ...valid, customCss: atLimit + "a" });
    expect(result).toEqual({ ok: false, errors: { customCss: "Custom CSS must be 20,000 characters or fewer." } });
  });

  it("reports a CSS problem alongside other field errors", () => {
    const result = parseApplicationForm({ ...valid, name: "", customCss: "</style>" });
    expect(result).toMatchObject({
      ok: false,
      errors: { name: "Name is required.", customCss: 'CSS cannot contain the sequence "</".' },
    });
  });
});

describe("readApplicationForm", () => {
  it("reads the five fields and treats missing ones as empty strings", () => {
    const fd = new FormData();
    fd.set("name", "Feedback");
    fd.set("schemaJson", "{}");
    expect(readApplicationForm(fd)).toEqual({
      name: "Feedback",
      slug: "",
      description: "",
      schemaJson: "{}",
      customCss: "",
    });
  });

  it("reads custom CSS from the form", () => {
    const fd = new FormData();
    fd.set("customCss", "h1 { color: red; }");
    expect(readApplicationForm(fd).customCss).toBe("h1 { color: red; }");
  });
});
