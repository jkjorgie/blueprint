// Tests for the responses table. No database: the component takes plain props,
// so a hand-written schema and a couple of fake rows cover every rule.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import type { AppSchema } from "@/lib/schema/app-schema";
import { RecordsTable, formatValue, type RecordRow } from "./records-table";

// Deliberately small, but one field of each awkward type: a plain string, a
// boolean that needs Yes/No, and a date that needs time-zone-safe parsing.
const schema: AppSchema = {
  title: "Bug Reports",
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "reproducible", label: "Reproducible every time", type: "boolean", required: false },
    { name: "reported_on", label: "Reported on", type: "date", required: true },
  ],
};

const records: RecordRow[] = [
  {
    id: "rec-1",
    data: { title: "Save button does nothing on Safari", reproducible: true, reported_on: "2026-09-01" },
    createdAt: new Date("2026-09-01T10:00:00"),
  },
  {
    // Second row leaves reported_on out entirely, so the missing-value rule is
    // exercised by a real row rather than only by the helper's unit test.
    id: "rec-2",
    data: { title: "Typo on the welcome banner", reproducible: false },
    createdAt: new Date("2026-09-03T10:00:00"),
  },
];

const appId = "app-1";

describe("RecordsTable", () => {
  it("renders a column per schema field plus Submitted and Actions", () => {
    render(<RecordsTable schema={schema} records={records} appId={appId} />);

    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
    // Asserting the whole array in order, not just membership: a column that
    // drifts out of position would still pass individual checks.
    expect(headers).toEqual([
      "Title",
      "Reproducible every time",
      "Reported on",
      "Submitted",
      "Actions",
    ]);
  });

  it("renders edit and delete links for each response", () => {
    render(<RecordsTable schema={schema} records={records} appId={appId} />);

    expect(screen.getByRole("link", { name: "Edit response 1" })).toHaveAttribute(
      "href",
      "/apps/app-1/responses/rec-1/edit",
    );
    expect(screen.getByRole("link", { name: "Delete response 1" })).toHaveAttribute(
      "href",
      "/apps/app-1/responses/rec-1/delete",
    );
    expect(screen.getByRole("link", { name: "Edit response 2" })).toHaveAttribute(
      "href",
      "/apps/app-1/responses/rec-2/edit",
    );
    expect(screen.getByRole("link", { name: "Delete response 2" })).toHaveAttribute(
      "href",
      "/apps/app-1/responses/rec-2/delete",
    );
  });

  it("formats booleans, dates, and missing values", () => {
    render(<RecordsTable schema={schema} records={records} appId={appId} />);

    const rows = screen.getAllByRole("row");
    // rows[0] is the header row, so the data rows start at index 1.
    const first = rows[1].querySelectorAll("td");
    const second = rows[2].querySelectorAll("td");

    expect(first[0].textContent).toBe("Save button does nothing on Safari");
    expect(first[1].textContent).toBe("Yes");
    // Built the same way the component does, so this passes in any time zone
    // while still failing if the component drops the T00:00:00 guard in a
    // zone behind UTC.
    expect(first[2].textContent).toBe(new Date("2026-09-01T00:00:00").toLocaleDateString());

    expect(second[1].textContent).toBe("No");
    // Missing value renders as a blank cell, not "undefined".
    expect(second[2].textContent).toBe("");
  });

  it("ignores data for fields that were removed from the schema", () => {
    const withExtra: RecordRow[] = [
      {
        id: "rec-3",
        data: {
          title: "Kept",
          reproducible: true,
          reported_on: "2026-09-01",
          severity: "High",
        },
        createdAt: new Date(),
      },
    ];
    render(<RecordsTable schema={schema} records={withExtra} appId={appId} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(5);
    expect(screen.getAllByRole("row")[1].querySelectorAll("td")).toHaveLength(5);
    expect(screen.queryByText("High")).not.toBeInTheDocument();
  });

  it("names the table for screen readers", () => {
    render(<RecordsTable schema={schema} records={records} appId={appId} />);
    expect(screen.getByRole("table")).toHaveAccessibleName("Responses to Bug Reports");
  });

  it("shows a paragraph instead of an empty table when there are no responses", () => {
    render(<RecordsTable schema={schema} records={[]} appId={appId} />);

    expect(screen.getByText("No responses yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <RecordsTable schema={schema} records={records} appId={appId} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

// The helper carries the display rules, so it is worth pinning down directly:
// these cases are cheaper to state here than to build a whole row for.
describe("formatValue", () => {
  const boolean = schema.fields[1];
  const date = schema.fields[2];
  const text = schema.fields[0];

  it("renders missing values as blank", () => {
    expect(formatValue(text, undefined)).toBe("");
    expect(formatValue(text, null)).toBe("");
    // false is a real answer, not a missing one, so it must survive the check.
    expect(formatValue(boolean, false)).toBe("No");
  });

  it("renders the stored calendar day, not the UTC one", () => {
    expect(formatValue(date, "2026-09-03")).toBe(
      new Date("2026-09-03T00:00:00").toLocaleDateString(),
    );
  });

  it("falls back to the raw value for an unparseable date", () => {
    expect(formatValue(date, "not-a-date")).toBe("not-a-date");
  });

  it("stringifies everything else", () => {
    expect(formatValue(text, "Save button")).toBe("Save button");
    expect(formatValue(text, 42)).toBe("42");
  });
});
