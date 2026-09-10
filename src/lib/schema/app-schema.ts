// The contract for an analyst-defined application.
//
// An analyst supplies JSON in this shape; we validate it here before it is
// stored on Application.schema. Everything that renders a form, validates a
// record, or builds a list view should derive from these types rather than
// re-parsing the JSON.
import { z } from "zod";

export const FIELD_TYPES = ["text", "textarea", "number", "boolean", "date", "select"] as const;
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

export const fieldSchema = z.discriminatedUnion("type", [
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
]);

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
    });
  });

export type AppSchema = z.infer<typeof appSchema>;
export type AppSchemaInput = z.input<typeof appSchema>;
export type Field = z.infer<typeof fieldSchema>;

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
