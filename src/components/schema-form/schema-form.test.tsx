import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import type { AppSchema } from "@/lib/schema/app-schema";
import type { RecordFormState } from "@/lib/schema/record-schema";
import { SchemaForm } from "./schema-form";

const schema: AppSchema = {
  title: "Bug Reports",
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "severity", label: "Severity", type: "select", required: true, options: ["Low", "High"] },
    { name: "description", label: "Description", type: "textarea", required: false, helpText: "What happened?" },
    { name: "reproducible", label: "Reproducible", type: "boolean", required: false },
    { name: "reported_on", label: "Reported on", type: "date", required: true },
    { name: "count", label: "Count", type: "number", required: false },
  ],
};

const noop = async (): Promise<RecordFormState> => ({});

describe("SchemaForm", () => {
  it("renders a labeled control for every field", () => {
    render(<SchemaForm schema={schema} action={noop} />);
    expect(screen.getByRole("textbox", { name: /title/i })).toBeRequired();
    expect(screen.getByRole("combobox", { name: /severity/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /description/i })).toHaveAccessibleDescription("What happened?");
    expect(screen.getByRole("checkbox", { name: /reproducible/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/reported on/i)).toHaveAttribute("type", "date");
    expect(screen.getByRole("spinbutton", { name: /count/i })).toBeInTheDocument();
  });

  it("pre-fills default values", () => {
    render(<SchemaForm schema={schema} action={noop} defaultValues={{ title: "Hi", severity: "High", reproducible: true }} />);
    expect(screen.getByRole("textbox", { name: /title/i })).toHaveValue("Hi");
    expect(screen.getByRole("combobox", { name: /severity/i })).toHaveValue("High");
    expect(screen.getByRole("checkbox", { name: /reproducible/i })).toBeChecked();
  });

  it("shows returned errors next to their fields, in a focused summary, and keeps typed values", async () => {
    const action = vi.fn(async (): Promise<RecordFormState> => ({
      errors: { title: "Title is required", severity: "Severity is required" },
      values: { description: "kept" },
    }));
    render(<SchemaForm schema={schema} action={action} />);

    await userEvent.type(screen.getByRole("textbox", { name: /description/i }), "kept");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Please fix 2 fields");
    expect(summary).toHaveFocus();

    const title = screen.getByRole("textbox", { name: /title/i });
    expect(title).toBeInvalid();
    expect(title).toHaveAccessibleDescription("Title is required");
    expect(screen.getByRole("textbox", { name: /description/i })).toHaveValue("kept");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<SchemaForm schema={schema} action={noop} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
