// Column sorting for responses: type-aware, and done in code like search.
import type { AppSchema, Field } from "@/lib/schema/app-schema";

export type SortDir = "asc" | "desc";
export type Sort = { field: string; dir: SortDir };

export const SUBMITTED = "submitted";

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

// An unknown field or direction means no sort, so a hand-edited URL cannot break the page.
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

type SortKey = number | string | null;

type Kind = "number" | "ordinal" | "text";

function kindOf(field: Field | null): Kind {
  if (field === null) return "number";
  if (field.type === "number" || field.type === "boolean" || field.type === "list") return "number";
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
      const n =
        typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
      return Number.isFinite(n) ? n : null;
    }
    case "boolean":
      return typeof value === "boolean" ? (value ? 1 : 0) : null;
    case "list":
      return Array.isArray(value) && value.length > 0 ? value.length : null;
    default: {
      const text = String(value);
      return text === "" ? null : text;
    }
  }
}

function comparePresent(a: number | string, b: number | string, kind: Kind): number {
  if (kind === "number") return (a as number) - (b as number);
  if (kind === "ordinal") return a < b ? -1 : a > b ? 1 : 0;
  return (a as string).localeCompare(b as string, undefined, { sensitivity: "accent" });
}

// Returns a new array. Missing values sort last in both directions; ties keep their order.
export function sortRecords<T extends { data: unknown; createdAt: Date }>(
  schema: AppSchema,
  records: T[],
  sort: Sort | null,
): T[] {
  const copy = [...records];
  if (!sort) return copy;

  const field = sort.field === SUBMITTED ? null : schema.fields.find((f) => f.name === sort.field);
  if (field === undefined) return copy;

  const kind = kindOf(field);
  const direction = sort.dir === "desc" ? -1 : 1;

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

// Clicking the active column flips it; any other column starts ascending.
export function nextSort(active: Sort | null, field: string): Sort {
  if (active && active.field === field) {
    return { field, dir: active.dir === "asc" ? "desc" : "asc" };
  }
  return { field, dir: "asc" };
}

// Sort links carry the current search along.
export function sortHref(basePath: string, query: string, sort: Sort): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("sort", sort.field);
  params.set("dir", sort.dir);
  return `${basePath}?${params.toString()}`;
}
