// Free-text search over responses. Values live in JSON, so filtering happens in code.
import type { AppSchema } from "@/lib/schema/app-schema";

// Only free text is searched; matching "high" against a dropdown would surprise people.
const SEARCHABLE_TYPES = new Set(["text", "textarea"]);

function matches(value: unknown, needle: string): boolean {
  return typeof value === "string" && value.toLowerCase().includes(needle);
}

// A repeated ?q= arrives as an array; take the first value.
export function normalizeQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim();
}

export function searchRecords<T extends { data: unknown }>(schema: AppSchema, records: T[], query: string): T[] {
  const needle = query.toLowerCase();
  const fields = schema.fields.filter((field) => SEARCHABLE_TYPES.has(field.type));
  const lists = schema.fields.flatMap((field) =>
    field.type === "list"
      ? [{ name: field.name, subs: field.fields.filter((sub) => SEARCHABLE_TYPES.has(sub.type)) }]
      : [],
  );

  return records.filter((record) => {
    if (!record.data || typeof record.data !== "object") return false;
    const data = record.data as Record<string, unknown>;

    if (fields.some((field) => matches(data[field.name], needle))) return true;

    return lists.some((list) => {
      const items = data[list.name];
      if (!Array.isArray(items)) return false;
      return items.some(
        (item) =>
          item !== null &&
          typeof item === "object" &&
          list.subs.some((sub) => matches((item as Record<string, unknown>)[sub.name], needle)),
      );
    });
  });
}

export function describeMatches(count: number, query: string): string {
  if (count === 0) return `No responses match '${query}'`;
  if (count === 1) return `1 response matches '${query}'`;
  return `${count} responses match '${query}'`;
}
