// Validates one submitted record against an application's schema.
//
// Form data arrives as strings (checkboxes as "on" or missing). Each field's
// Zod schema first normalizes that raw value, then checks it, so the same code
// works for HTML forms today and CSV import later via validateRecord().
import { z } from "zod";
import type { AppSchema, Field, RecordErrors } from "./app-schema";

export type RecordValue = string | number | boolean;
export type RecordData = Record<string, RecordValue>;

export type RecordResult = { ok: true; data: RecordData } | { ok: false; errors: RecordErrors };

// What a schema-driven form's server action returns to the form.
export type RecordFormState = {
  errors?: RecordErrors;
  formError?: string;
  // The raw submission, echoed back so the form keeps what the user typed.
  values?: Record<string, string>;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Empty or whitespace-only strings count as "not provided".
function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") return value === undefined || value === null ? undefined : String(value);
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function normalizeNumber(value: unknown): number | string | undefined {
  if (typeof value === "number") return value;
  const text = normalizeText(value);
  if (text === undefined) return undefined;
  const parsed = Number(text);
  // Hand the original text to z.number() so it reports "must be a number".
  return Number.isNaN(parsed) ? text : parsed;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === "on" || value === "true";
}

function requiredOr(field: Field, invalid: string) {
  return (issue: { input: unknown }) => (issue.input === undefined ? `${field.label} is required` : invalid);
}

function fieldSchema(field: Field): z.ZodType {
  const label = field.label;

  switch (field.type) {
    case "text":
    case "textarea": {
      let base = z.string({ error: requiredOr(field, `${label} must be text`) });
      if (field.maxLength) {
        base = base.max(field.maxLength, `${label} must be ${field.maxLength} characters or fewer`);
      }
      return z.preprocess(normalizeText, field.required ? base : base.optional());
    }

    case "number": {
      let base = z.number({ error: requiredOr(field, `${label} must be a number`) });
      if (field.min !== undefined) base = base.min(field.min, `${label} must be at least ${field.min}`);
      if (field.max !== undefined) base = base.max(field.max, `${label} must be at most ${field.max}`);
      return z.preprocess(normalizeNumber, field.required ? base : base.optional());
    }

    case "boolean": {
      // A required checkbox means it must be checked, like agreeing to terms.
      const base = field.required ? z.literal(true, { error: `${label} must be checked` }) : z.boolean();
      return z.preprocess(normalizeBoolean, base);
    }

    case "date": {
      const base = z
        .string({ error: requiredOr(field, `${label} must be a date`) })
        .regex(DATE_PATTERN, `${label} must be a date in YYYY-MM-DD format`)
        .refine(isRealDate, `${label} must be a real date`);
      return z.preprocess(normalizeText, field.required ? base : base.optional());
    }

    case "select": {
      const options = field.options as [string, ...string[]];
      const base = z.enum(options, { error: requiredOr(field, `${label} must be one of the listed options`) });
      return z.preprocess(normalizeText, field.required ? base : base.optional());
    }
  }
}

// A Zod object with one entry per field. Unknown keys are dropped.
export function buildRecordSchema(schema: AppSchema) {
  return z.object(Object.fromEntries(schema.fields.map((field) => [field.name, fieldSchema(field)])));
}

// Validates a plain object of raw values (strings from a form, or anything
// from another source). Returns typed data with optional empties removed.
export function validateRecord(schema: AppSchema, input: Record<string, unknown>): RecordResult {
  const result = buildRecordSchema(schema).safeParse(input);

  if (!result.success) {
    const errors: RecordErrors = {};
    for (const issue of result.error.issues) {
      const name = String(issue.path[0] ?? "");
      // Keep only the first problem per field; one message is enough to act on.
      if (name && !errors[name]) errors[name] = issue.message;
    }
    return { ok: false, errors };
  }

  const data: RecordData = {};
  for (const [key, value] of Object.entries(result.data)) {
    if (value !== undefined) data[key] = value as RecordValue;
  }
  return { ok: true, data };
}

// The raw text of every field in a submission, for echoing back into a form.
export function rawValues(schema: AppSchema, formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of schema.fields) {
    const value = formData.get(field.name);
    if (typeof value === "string") values[field.name] = value;
  }
  return values;
}

// Validates a submitted HTML form.
export function parseRecord(schema: AppSchema, formData: FormData): RecordResult {
  const input: Record<string, unknown> = {};
  for (const field of schema.fields) {
    const value = formData.get(field.name);
    input[field.name] = value === null ? undefined : value;
  }
  return validateRecord(schema, input);
}
