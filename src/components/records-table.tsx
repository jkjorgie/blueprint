// Renders one application's responses as a table. The columns come from the
// app's schema rather than being hard-coded, so the same component works for
// any analyst-defined application.
//
// Code says "record" to match the DataRecord model; anything a person reads says "response".
import Link from "next/link";
import type { ReactNode } from "react";
import { countItems, type AppSchema, type Field, type ListField } from "@/lib/schema/app-schema";
import { SUBMITTED, type Sort } from "@/lib/record-sort";

// DataRecord.data is JSONB, so Prisma types it loosely. The page casts each
// row's data to Record<string, unknown> before reading field names out of it.
export type RecordRow = {
  id: string;
  data: unknown;
  createdAt: Date;
};

// Turns one stored value into display text. Kept separate from the JSX so the
// formatting rules can be unit tested on their own.
export function formatValue(field: Field, value: unknown): string {
  // A field added to the schema after a record was submitted has no value in
  // that record. Blank is the right answer, not "undefined".
  if (value === undefined || value === null) return "";

  if (field.type === "boolean") return value ? "Yes" : "No";

  // The item count, as the list cell's summary shows it.
  if (field.type === "list") {
    const count = listItems(value).length;
    return count === 0 ? "" : countItems(count, field.itemLabel);
  }

  if (field.type === "date") {
    const text = String(value);
    // Stored as YYYY-MM-DD. new Date("2026-09-03") parses that as midnight UTC,
    // which renders as 2 September for anyone west of Greenwich. Appending a
    // time forces it to be read in the viewer's own time zone instead.
    const date = new Date(`${text}T00:00:00`);
    // A malformed date should still show the raw value rather than the string
    // "Invalid Date".
    if (Number.isNaN(date.getTime())) return text;
    return date.toLocaleDateString();
  }

  return String(value);
}

// The usable items of a stored list. Anything that is not an object is skipped
// rather than breaking the cell.
function listItems(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => item !== null && typeof item === "object");
}

// A list cell: the count, expanding to one line per item. A native <details>
// keeps the row short and needs no script to open.
function ListCell({ field, value }: { field: ListField; value: unknown }) {
  const items = listItems(value);
  if (items.length === 0) return null;

  return (
    <details>
      <summary className="cursor-pointer">{formatValue(field, value)}</summary>
      <ol className="mt-1 list-decimal space-y-1 pl-5">
        {items.map((item, index) => (
          <li key={index}>
            {field.fields
              .map((sub) => [sub.label, formatValue(sub, item[sub.name])] as const)
              // A blank sub-field is left out so the line stays short.
              .filter(([, text]) => text !== "")
              .map(([label, text]) => `${label}: ${text}`)
              .join("; ")}
          </li>
        ))}
      </ol>
    </details>
  );
}

const cell = "border-b border-line py-2 pr-4";

// Turns column headers into sort links. The page supplies hrefFor so each link
// can carry the current search along; the table only decides what to render.
export type TableSort = {
  active: Sort | null;
  hrefFor: (field: string) => string;
};

// One sortable (or plain) column header.
function HeaderCell({ field, label, sort }: { field: string; label: ReactNode; sort?: TableSort }) {
  const dir = sort?.active?.field === field ? sort.active.dir : null;

  return (
    <th
      scope="col"
      // Only the active column carries aria-sort. Screen readers read it out
      // as "sorted ascending" or "sorted descending" for that column.
      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}
      className={`${cell} font-medium`}
    >
      {sort ? (
        <Link href={sort.hrefFor(field)} className="inline-flex items-center gap-1 hover:underline">
          {label}
          {/* The arrow is for sighted users. aria-hidden stops it being read as
              "up-pointing triangle", since aria-sort already says the same. */}
          {dir && (
            <span aria-hidden="true" className="text-xs">
              {dir === "asc" ? "▲" : "▼"}
            </span>
          )}
        </Link>
      ) : (
        label
      )}
    </th>
  );
}

export function RecordsTable({
  schema,
  records,
  appId,
  canEdit = true,
  canDelete = true,
  sort,
}: {
  schema: AppSchema;
  records: RecordRow[];
  // When set, each row gets action links. Left out for archived applications
  // and for users whose role allows neither edit nor delete.
  appId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  // When set, column headers become sort links. Independent of appId, so an
  // archived application's table still sorts.
  sort?: TableSort;
}) {
  // A sentence, not an empty table. A table with headers and no rows reads as
  // broken rather than as "nothing here yet".
  if (records.length === 0) {
    return <p className="text-ink-muted">No responses yet.</p>;
  }

  return (
    // A schema can have up to 50 fields, so the table can outgrow the viewport.
    // Scrolling this wrapper sideways keeps the rest of the page intact.
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        {/* Names the table for screen reader users, who may land on it without
            having read the heading above. sr-only keeps it out of the visual
            layout, where the h1 already says the same thing. */}
        <caption className="sr-only">Responses to {schema.title}</caption>
        <thead>
          <tr>
            {/* scope="col" (set in HeaderCell) ties every cell below to its
                header, so a screen reader can announce "Severity: High"
                instead of just "High". */}
            {schema.fields.map((field) => (
              <HeaderCell key={field.name} field={field.name} label={field.label} sort={sort} />
            ))}
            <HeaderCell field={SUBMITTED} label="Submitted" sort={sort} />
            {appId && (
              <th scope="col" className={`${cell} font-medium`}>
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => {
            const rowNumber = index + 1;
            const data = record.data as Record<string, unknown>;

            return (
              <tr key={record.id}>
                {/* Iterating schema.fields again, not the keys of data, is what
                    keeps every cell under the header it belongs to. A record
                    missing a key simply renders blank, and a leftover key from
                    a removed field is ignored rather than shifting the row. */}
                {schema.fields.map((field) => (
                  <td key={field.name} className={cell}>
                    {field.type === "list" ? (
                      <ListCell field={field} value={data[field.name]} />
                    ) : (
                      formatValue(field, data[field.name])
                    )}
                  </td>
                ))}
                <td className={cell}>{record.createdAt.toLocaleDateString()}</td>
                {appId && (
                  <td className={cell}>
                    <div className="flex gap-3">
                      {canEdit && (
                        <Link
                          href={`/apps/${appId}/responses/${record.id}/edit`}
                          className="underline"
                          aria-label={`Edit response ${rowNumber}`}
                        >
                          Edit
                        </Link>
                      )}
                      {canDelete && (
                        <Link
                          href={`/apps/${appId}/responses/${record.id}/delete`}
                          className="underline"
                          aria-label={`Delete response ${rowNumber}`}
                        >
                          Delete
                        </Link>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
