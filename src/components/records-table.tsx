// Renders responses as a table whose columns come from the application's schema.
// Code says "record" to match the DataRecord model; the UI says "response".
import Link from "next/link";
import type { ReactNode } from "react";
import { countItems, type AppSchema, type Field, type ListField } from "@/lib/schema/app-schema";
import { SUBMITTED, type Sort } from "@/lib/record-sort";

export type RecordRow = {
  id: string;
  data: unknown;
  createdAt: Date;
};

// Turns one stored value into display text.
export function formatValue(field: Field, value: unknown): string {
  if (value === undefined || value === null) return "";

  if (field.type === "boolean") return value ? "Yes" : "No";

  if (field.type === "list") {
    const count = listItems(value).length;
    return count === 0 ? "" : countItems(count, field.itemLabel);
  }

  if (field.type === "date") {
    const text = String(value);
    // Stored as YYYY-MM-DD. Appending a time avoids the UTC parse that shows the previous day.
    const date = new Date(`${text}T00:00:00`);
    if (Number.isNaN(date.getTime())) return text;
    return date.toLocaleDateString();
  }

  return String(value);
}

function listItems(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => item !== null && typeof item === "object");
}

// A list cell: the item count, expanding to one line per item.
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

export type TableSort = {
  active: Sort | null;
  hrefFor: (field: string) => string;
};

// A column header, rendered as a sort link when sorting is enabled.
function HeaderCell({ field, label, sort }: { field: string; label: ReactNode; sort?: TableSort }) {
  const dir = sort?.active?.field === field ? sort.active.dir : null;

  return (
    <th
      scope="col"
      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}
      className={`${cell} font-medium`}
    >
      {sort ? (
        <Link href={sort.hrefFor(field)} className="inline-flex items-center gap-1 hover:underline">
          {label}
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
  // Set to show Edit and Delete links; omitted for archived applications and read-only roles.
  appId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  sort?: TableSort;
}) {
  if (records.length === 0) {
    return <p className="text-ink-muted">No responses yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Responses to {schema.title}</caption>
        <thead>
          <tr>
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
