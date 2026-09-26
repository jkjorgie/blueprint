// Free-text search over an application's responses.
//
// Response data is JSONB, and matching inside JSON case-insensitively is
// awkward in Postgres, so the page loads an application's responses and
// filters them here. An application holds at most a few hundred responses,
// which keeps this cheap. Kept apart from the page so the rules can be unit
// tested without a database or a request.
import type { AppSchema } from "@/lib/schema/app-schema";

// Only free text is searched. Selects, numbers, dates, and booleans are left
// out on purpose: matching "high" against a Severity dropdown, or "1" against
// every quantity, would surprise more people than it helps.
const SEARCHABLE_TYPES = new Set(["text", "textarea"]);

// Turns the raw ?q= value into the query to search for, or "" for no search.
// A repeated key (?q=a&q=b) arrives as an array; taking the first value keeps
// a hand-edited URL from crashing the page with a 500.
export function normalizeQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim();
}

// Keeps the responses where any text or textarea field contains the query,
// ignoring case. Generic over the row type so the page gets back exactly the
// rows it passed in, ready for RecordsTable.
export function searchRecords<T extends { data: unknown }>(
  schema: AppSchema,
  records: T[],
  query: string,
): T[] {
  const needle = query.toLowerCase();
  const fields = schema.fields.filter((field) => SEARCHABLE_TYPES.has(field.type));

  return records.filter((record) => {
    // A row whose data is not an object has nothing to search.
    if (!record.data || typeof record.data !== "object") return false;
    const data = record.data as Record<string, unknown>;

    return fields.some((field) => {
      const value = data[field.name];
      // Missing or non-string values never match. This also stops a record
      // saved before a field existed from matching on "undefined".
      return typeof value === "string" && value.toLowerCase().includes(needle);
    });
  });
}

// The sentence read out by the status region after a search.
export function describeMatches(count: number, query: string): string {
  if (count === 0) return `No responses match '${query}'`;
  // Singular and plural both handled, so one match does not read "1 responses".
  if (count === 1) return `1 response matches '${query}'`;
  return `${count} responses match '${query}'`;
}
