// Validates one submitted record against an application's schema.
//
// Form data arrives as strings (checkboxes as "on" or missing). Each field's
// Zod schema first normalizes that raw value, then checks it, so the same code
// works for HTML forms today and CSV import later via validateRecord().
import { z } from "zod";
import { countItems, type AppSchema, type ListField, type RecordErrors, type ScalarField } from "./app-schema";

export type ScalarValue = string | number | boolean;
// One filled-in item of a list field, keyed by sub-field name.
export type ListItem = Record<string, ScalarValue>;
export type RecordValue = ScalarValue | ListItem[];
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

function requiredOr(field: ScalarField, invalid: string) {
  return (issue: { input: unknown }) => (issue.input === undefined ? `${field.label} is required` : invalid);
}

function fieldSchema(field: ScalarField): z.ZodType {
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

// A row counts as empty, and is dropped, when no sub-field has a value. An
// unchecked checkbox is empty too, since that is how an untouched row arrives.
function isEmptyRow(field: ListField, row: Record<string, unknown>): boolean {
  return field.fields.every((sub) =>
    sub.type === "boolean" ? !normalizeBoolean(row[sub.name]) : normalizeText(row[sub.name]) === undefined,
  );
}

function withoutUndefined(row: Record<string, unknown>): ListItem {
  const item: ListItem = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) item[key] = value as ScalarValue;
  }
  return item;
}

// A list arrives as an array of raw rows. Each row is checked with the same
// per-type rules as a top-level field. Row issues keep the row's position in
// the incoming array, so `steps.2.action` points at the third row the form
// sent even when an empty row before it is dropped. Count rules apply to the
// non-empty rows, valid or not, so one bad row is not also reported as a
// missing one. They are reported against the list's own name.
function listSchema(field: ListField): z.ZodType {
  const rowSchema = z.object(Object.fromEntries(field.fields.map((sub) => [sub.name, fieldSchema(sub)])));

  return z.unknown().transform((value, ctx) => {
    if (value !== undefined && value !== null && !Array.isArray(value)) {
      ctx.addIssue({ code: "custom", message: `${field.label} must be a list` });
      return z.NEVER;
    }

    const items: ListItem[] = [];
    let filled = 0;
    (value ?? []).forEach((raw: unknown, index: number) => {
      const row = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      if (isEmptyRow(field, row)) return;
      filled += 1;
      const result = rowSchema.safeParse(row);
      if (result.success) {
        items.push(withoutUndefined(result.data));
      } else {
        for (const issue of result.error.issues) {
          ctx.addIssue({ code: "custom", message: issue.message, path: [index, ...issue.path] });
        }
      }
    });

    if (field.required && filled === 0) {
      ctx.addIssue({ code: "custom", message: `${field.label} is required` });
    } else if (filled < field.minItems) {
      ctx.addIssue({
        code: "custom",
        message: `${field.label} needs at least ${countItems(field.minItems, field.itemLabel)}`,
      });
    } else if (filled > field.maxItems) {
      ctx.addIssue({
        code: "custom",
        message: `${field.label} can have at most ${countItems(field.maxItems, field.itemLabel)}`,
      });
    }

    // No items is stored as no value, the same as any other empty optional.
    return items.length === 0 ? undefined : items;
  });
}

// A Zod object with one entry per field. Unknown keys are dropped.
export function buildRecordSchema(schema: AppSchema) {
  return z.object(
    Object.fromEntries(
      schema.fields.map((field) => [field.name, field.type === "list" ? listSchema(field) : fieldSchema(field)]),
    ),
  );
}

// Validates a plain object of raw values (strings from a form, or anything
// from another source). Returns typed data with optional empties removed.
export function validateRecord(schema: AppSchema, input: Record<string, unknown>): RecordResult {
  const result = buildRecordSchema(schema).safeParse(input);

  if (!result.success) {
    const errors: RecordErrors = {};
    for (const issue of result.error.issues) {
      // A top-level field's issue path is just its name. A list row's is
      // [list, index, sub], which becomes the "steps.0.action" key the form
      // names that control with.
      const name = issue.path.map(String).join(".");
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

// A list's sub-controls are named `${list}.${index}.${sub}`. Collects the rows
// present in a submission in ascending index order, so gaps left by rows
// removed in the browser (0, 2, 5) become a dense array (0, 1, 2).
function readListRows(field: ListField, formData: FormData): Record<string, unknown>[] {
  const subNames = new Set(field.fields.map((sub) => sub.name));
  const indices = new Set<number>();
  for (const key of formData.keys()) {
    const [list, index, sub, ...rest] = key.split(".");
    // A canonical whole number only, so "01" and "1" cannot name the same row twice.
    if (list === field.name && rest.length === 0 && subNames.has(sub) && /^(0|[1-9]\d*)$/.test(index)) {
      indices.add(Number(index));
    }
  }

  return [...indices]
    .sort((a, b) => a - b)
    .map((index) => {
      const row: Record<string, unknown> = {};
      for (const sub of field.fields) {
        const value = formData.get(`${field.name}.${index}.${sub.name}`);
        row[sub.name] = value === null ? undefined : value;
      }
      return row;
    });
}

// Validates a submitted HTML form.
export function parseRecord(schema: AppSchema, formData: FormData): RecordResult {
  const input: Record<string, unknown> = {};
  for (const field of schema.fields) {
    if (field.type === "list") {
      input[field.name] = readListRows(field, formData);
      continue;
    }
    const value = formData.get(field.name);
    input[field.name] = value === null ? undefined : value;
  }
  return validateRecord(schema, input);
}
