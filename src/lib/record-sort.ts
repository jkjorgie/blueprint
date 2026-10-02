// Column sorting for an application's responses.
//
// The values live inside DataRecord.data (JSONB), so sorting happens in code
// after loading, the same choice record-search.ts makes for filtering. Kept
// apart from the page and the table so every rule is unit tested on its own.
import type { AppSchema, Field } from "@/lib/schema/app-schema";

export type SortDir = "asc" | "desc";
// `field` is a schema field name, or SUBMITTED for the Submitted column.
export type Sort = { field: string; dir: SortDir };

// The sort key for the Submitted column, which is not a schema field.
export const SUBMITTED = "submitted";

// A repeated key (?sort=a&sort=b) arrives as an array. Take the first value,
// as record-search does for ?q=.
function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

// Turns the raw ?sort= and ?dir= values into a sort, or null for "no sort".
// Only a real field name (or "submitted") and only "asc" or "desc" are
// accepted. Anything else is ignored rather than rejected, so a hand-edited or
// stale bookmarked URL renders the page unsorted instead of breaking it.
export function normalizeSort(
  rawSort: string | string[] | undefined,
  rawDir: string | string[] | undefined,
  schema: AppSchema,
): Sort | null {
  const field = first(rawSort);
  const dir = first(rawDir);
  if (dir !== "asc" && dir !== "desc") return null;
  if (!field) return null;
  if (field !== SUBMITTED && !schema.fields.some((f) => f.name === field)) return null;
  return { field, dir };
}

// null marks a value that is absent or unusable for its column.
type SortKey = number | string | null;

// How two present values of a column compare.
type Kind = "number" | "ordinal" | "text";

function kindOf(field: Field | null): Kind {
  // null is the Submitted column, compared as a timestamp.
  if (field === null) return "number";
  if (field.type === "number" || field.type === "boolean") return "number";
  // YYYY-MM-DD strings are already chronological under plain comparison.
  if (field.type === "date") return "ordinal";
  return "text";
}

function keyFor(field: Field | null, record: { data: unknown; createdAt: Date }): SortKey {
  if (field === null) {
    const time = record.createdAt instanceof Date ? record.createdAt.getTime() : NaN;
    return Number.isFinite(time) ? time : null;
  }

  const data = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : {};
  const value = data[field.name];
  if (value === undefined || value === null) return null;

  switch (field.type) {
    case "number": {
      // Stored as a JSON number, but a numeric string from older data still
      // sorts numerically rather than falling to the bottom.
      const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
      return Number.isFinite(n) ? n : null;
    }
    case "boolean":
      // false before true.
      return typeof value === "boolean" ? (value ? 1 : 0) : null;
    default: {
      // date, text, textarea, select. An empty string is a blank cell, so it
      // is treated as missing rather than sorting ahead of "a".
      const text = String(value);
      return text === "" ? null : text;
    }
  }
}

function comparePresent(a: number | string, b: number | string, kind: Kind): number {
  if (kind === "number") return (a as number) - (b as number);
  if (kind === "ordinal") return a < b ? -1 : a > b ? 1 : 0;
  // "accent" sensitivity ignores case only: "apple" and "Apple" tie, while
  // "resume" and "résumé" stay distinct.
  return (a as string).localeCompare(b as string, undefined, { sensitivity: "accent" });
}

// Returns a new array sorted by the given column. Never mutates the input.
//
// Missing values always sort last, in both directions, so blank cells collect
// at the bottom rather than jumping to the top when the order is reversed.
// Ties keep their incoming order (Array.prototype.sort is stable), which is
// newest first as loaded from the database.
export function sortRecords<T extends { data: unknown; createdAt: Date }>(
  schema: AppSchema,
  records: T[],
  sort: Sort | null,
): T[] {
  const copy = [...records];
  if (!sort) return copy;

  const field = sort.field === SUBMITTED ? null : schema.fields.find((f) => f.name === sort.field);
  // An unknown field cannot sort anything. normalizeSort already rules this
  // out; the check keeps sortRecords safe to call on its own.
  if (field === undefined) return copy;

  const kind = kindOf(field);
  const direction = sort.dir === "desc" ? -1 : 1;

  // Each key is computed once per record rather than on every comparison.
  const keyed = copy.map((record) => ({ record, key: keyFor(field, record) }));
  keyed.sort((a, b) => {
    const ka = a.key;
    const kb = b.key;
    if (ka === null && kb === null) return 0;
    if (ka === null) return 1;
    if (kb === null) return -1;
    return direction * comparePresent(ka, kb, kind);
  });
  return keyed.map((entry) => entry.record);
}

// What clicking a column header should do: flip the direction when that column
// is already the active sort, otherwise start ascending.
export function nextSort(active: Sort | null, field: string): Sort {
  if (active && active.field === field) {
    return { field, dir: active.dir === "asc" ? "desc" : "asc" };
  }
  return { field, dir: "asc" };
}

// The URL for a sort link. Carries the current search along, so sorting a
// filtered list keeps the filter. An empty query is left out entirely.
export function sortHref(basePath: string, query: string, sort: Sort): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("sort", sort.field);
  params.set("dir", sort.dir);
  return `${basePath}?${params.toString()}`;
}
