// Renders one application's records as a table. The columns come from the
// app's schema rather than being hard-coded, so the same component works for
// any analyst-defined application.
//
// UI copy says "records" here; see docs/backlog.md for the wider naming rule.
import type { AppSchema, Field } from "@/lib/schema/app-schema";

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

const cell = "border-b border-line py-2 pr-4";

export function RecordsTable({ schema, records }: { schema: AppSchema; records: RecordRow[] }) {
  // A sentence, not an empty table. A table with headers and no rows reads as
  // broken rather than as "nothing here yet".
  if (records.length === 0) {
    return <p className="text-ink-muted">No records yet.</p>;
  }

  return (
    // A schema can have up to 50 fields, so the table can outgrow the viewport.
    // Scrolling this wrapper sideways keeps the rest of the page intact.
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        {/* Names the table for screen reader users, who may land on it without
            having read the heading above. sr-only keeps it out of the visual
            layout, where the h1 already says the same thing. */}
        <caption className="sr-only">Records for {schema.title}</caption>
        <thead>
          <tr>
            {schema.fields.map((field) => (
              // scope="col" ties every cell below to this header, so a screen
              // reader can announce "Severity: High" instead of just "High".
              <th key={field.name} scope="col" className={`${cell} font-medium`}>
                {field.label}
              </th>
            ))}
            <th scope="col" className={`${cell} font-medium`}>
              Submitted
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const data = record.data as Record<string, unknown>;
            return (
              <tr key={record.id}>
                {/* Iterating schema.fields again, not the keys of data, is what
                    keeps every cell under the header it belongs to. A record
                    missing a key simply renders blank, and a leftover key from
                    a removed field is ignored rather than shifting the row. */}
                {schema.fields.map((field) => (
                  <td key={field.name} className={cell}>
                    {formatValue(field, data[field.name])}
                  </td>
                ))}
                <td className={cell}>{record.createdAt.toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
