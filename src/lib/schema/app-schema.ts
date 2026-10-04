// The contract for an analyst-defined application.
//
// An analyst supplies JSON in this shape; we validate it here before it is
// stored on Application.schema. Everything that renders a form, validates a
// record, or builds a list view should derive from these types rather than
// re-parsing the JSON.
import { z } from "zod";

export const FIELD_TYPES = ["text", "textarea", "number", "boolean", "date", "select", "list"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

// Field names become keys in DataRecord.data, so keep them machine-friendly.
const fieldName = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, "must start with a letter and use only lowercase letters, numbers, and underscores")
  .max(40, "must be 40 characters or fewer");

const baseField = z.object({
  name: fieldName,
  label: z.string().trim().min(1, "label is required").max(80, "label must be 80 characters or fewer"),
  required: z.boolean().default(false),
  helpText: z.string().trim().max(200, "helpText must be 200 characters or fewer").optional(),
});

const maxLength = z.number().int().positive().max(5000).optional();

// The six single-value types. These are also the only types a list may hold.
export const scalarFieldSchema = z.discriminatedUnion(
  "type",
  [
    baseField.extend({ type: z.literal("text"), maxLength }),
    baseField.extend({ type: z.literal("textarea"), maxLength }),
    baseField.extend({ type: z.literal("number"), min: z.number().optional(), max: z.number().optional() }),
    baseField.extend({ type: z.literal("boolean") }),
    baseField.extend({ type: z.literal("date") }),
    baseField.extend({
      type: z.literal("select"),
      options: z
        .array(z.string().trim().min(1, "options cannot be blank"))
        .min(1, "select fields need at least one option")
        .max(100, "select fields can have at most 100 options"),
    }),
  ],
  {
    // Zod's own message for an unknown type lists the allowed ones, which is
    // fine, but a nested list deserves a plainer explanation.
    error: (issue) =>
      issue.code === "invalid_union" && isObjectWithType(issue.input, "list")
        ? "a list cannot contain another list"
        : undefined,
  },
);

function isObjectWithType(value: unknown, type: string): boolean {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === type;
}

// A repeating group: the end user fills in the sub-fields once per item, as
// many times as minItems and maxItems allow. Stored as an array of objects.
const listField = baseField.extend({
  type: z.literal("list"),
  fields: z
    .array(scalarFieldSchema)
    .min(1, "list fields need at least one sub-field")
    .max(10, "list fields can have at most 10 sub-fields"),
  itemLabel: z
    .string()
    .trim()
    .min(1, "itemLabel cannot be blank")
    .max(40, "itemLabel must be 40 characters or fewer")
    .default("Item"),
  minItems: z.number().int("minItems must be a whole number").min(0, "minItems cannot be negative").default(0),
  maxItems: z
    .number()
    .int("maxItems must be a whole number")
    .min(1, "maxItems must be at least 1")
    .max(50, "maxItems must be 50 or fewer")
    .default(20),
});

export const fieldSchema = z.discriminatedUnion("type", [...scalarFieldSchema.options, listField]);

export const appSchema = z
  .object({
    title: z.string().trim().min(1, "title is required").max(80, "title must be 80 characters or fewer"),
    fields: z
      .array(fieldSchema)
      .min(1, "at least one field is required")
      .max(50, "an application can have at most 50 fields"),
  })
  .superRefine((schema, ctx) => {
    const seen = new Set<string>();
    schema.fields.forEach((field, index) => {
      if (seen.has(field.name)) {
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, "name"],
          message: `duplicate field name "${field.name}"`,
        });
      }
      seen.add(field.name);

      if (field.type !== "list") return;
      // Sub-field names only need to be unique within their own list, since
      // each item is its own object.
      const seenInList = new Set<string>();
      field.fields.forEach((sub, subIndex) => {
        if (seenInList.has(sub.name)) {
          ctx.addIssue({
            code: "custom",
            path: ["fields", index, "fields", subIndex, "name"],
            message: `duplicate field name "${sub.name}"`,
          });
        }
        seenInList.add(sub.name);
      });
      if (field.minItems > field.maxItems) {
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, "minItems"],
          message: "minItems cannot be more than maxItems",
        });
      }
    });
  });

export type AppSchema = z.infer<typeof appSchema>;
export type AppSchemaInput = z.input<typeof appSchema>;
export type Field = z.infer<typeof fieldSchema>;
export type ScalarField = z.infer<typeof scalarFieldSchema>;
export type ListField = Extract<Field, { type: "list" }>;

// "1 Step", "3 Steps". The item label is analyst-supplied, so the plural is
// the simple English one.
export function countItems(count: number, itemLabel: string): string {
  return `${count} ${count === 1 ? itemLabel : `${itemLabel}s`}`;
}

export type ParseResult = { ok: true; schema: AppSchema } | { ok: false; errors: string[] };

// Validates an already-parsed JSON value. Errors are plain sentences prefixed
// with the path that failed (for example "fields.2.options: ...") so they can be
// shown directly to the analyst.
export function parseAppSchema(input: unknown): ParseResult {
  const result = appSchema.safeParse(input);
  if (result.success) {
    return { ok: true, schema: result.data };
  }
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.map(String).join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return { ok: false, errors };
}

// Convenience for textarea input: handles malformed JSON before validating shape.
export function parseAppSchemaJson(text: string): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error";
    return { ok: false, errors: [`Invalid JSON: ${detail}`] };
  }
  return parseAppSchema(value);
}

// Validation errors for one record, keyed by field name. The form renderer
// displays these next to the matching control; the record validator produces
// them. Both sides build against this type so they can be developed in parallel.
export type RecordErrors = Partial<Record<string, string>>;
