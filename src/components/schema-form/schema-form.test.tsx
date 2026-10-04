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
    render(
      <SchemaForm
        schema={schema}
        action={noop}
        defaultValues={{ title: "Hi", severity: "High", reproducible: true }}
      />,
    );
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

describe("SchemaForm list fields", () => {
  const listSchema: AppSchema = {
    title: "Bug Reports",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      {
        name: "steps",
        label: "Steps to reproduce",
        type: "list",
        required: false,
        helpText: "One action per step.",
        itemLabel: "Step",
        minItems: 0,
        maxItems: 3,
        fields: [
          { name: "action", label: "What you did", type: "text", required: true },
          { name: "blocking", label: "Blocks testing", type: "boolean", required: false },
        ],
      },
    ],
  };

  const actions = () => screen.queryAllByRole("textbox", { name: /what you did/i });
  const add = () => screen.getByRole("button", { name: "Add Step" });

  it("adds rows with numbered legends and sub-controls named for parseRecord", async () => {
    render(<SchemaForm schema={listSchema} action={noop} />);
    expect(actions()).toHaveLength(0);

    await userEvent.click(add());
    await userEvent.click(add());

    expect(screen.getByRole("group", { name: "Step 1" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Step 2" })).toBeInTheDocument();
    expect(actions().map((input) => input.getAttribute("name"))).toEqual(["steps.0.action", "steps.1.action"]);
    expect(screen.getAllByRole("checkbox", { name: /blocks testing/i })[1]).toHaveAttribute("name", "steps.1.blocking");
  });

  it("disables Add at maxItems and never submits from its buttons", async () => {
    const action = vi.fn(noop);
    render(<SchemaForm schema={listSchema} action={action} />);

    for (let i = 0; i < 3; i++) await userEvent.click(add());
    expect(add()).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Remove Step 2" }));
    expect(add()).toBeEnabled();
    expect(action).not.toHaveBeenCalled();
  });

  it("removes the right row and keeps the others' values with them", async () => {
    render(<SchemaForm schema={listSchema} action={noop} />);
    for (let i = 0; i < 3; i++) await userEvent.click(add());
    await userEvent.type(actions()[0], "first");
    await userEvent.type(actions()[1], "second");
    await userEvent.type(actions()[2], "third");
    await userEvent.click(screen.getAllByRole("checkbox", { name: /blocks testing/i })[2]);

    await userEvent.click(screen.getByRole("button", { name: "Remove Step 2" }));

    expect(actions().map((input) => (input as HTMLInputElement).value)).toEqual(["first", "third"]);
    expect(actions().map((input) => input.getAttribute("name"))).toEqual(["steps.0.action", "steps.1.action"]);
    expect(screen.getAllByRole("checkbox", { name: /blocks testing/i })[1]).toBeChecked();
    expect(screen.queryByRole("group", { name: "Step 3" })).not.toBeInTheDocument();
  });

  it("moves focus to the new row after Add, and to the previous row or Add after Remove", async () => {
    render(<SchemaForm schema={listSchema} action={noop} />);

    await userEvent.click(add());
    expect(actions()[0]).toHaveFocus();
    await userEvent.click(add());
    expect(actions()[1]).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Remove Step 2" }));
    expect(actions()[0]).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Remove Step 1" }));
    expect(add()).toHaveFocus();
  });

  it("moves focus to the row that takes the first slot when Step 1 is removed", async () => {
    render(<SchemaForm schema={listSchema} action={noop} />);
    await userEvent.click(add());
    await userEvent.click(add());
    await userEvent.type(actions()[1], "second");

    await userEvent.click(screen.getByRole("button", { name: "Remove Step 1" }));
    expect(actions()[0]).toHaveValue("second");
    expect(actions()[0]).toHaveFocus();
  });

  it("starts with the stored items when editing, in order", () => {
    render(
      <SchemaForm
        schema={listSchema}
        action={noop}
        defaultValues={{
          title: "Crash",
          steps: [
            { action: "Open", blocking: false },
            { action: "Tap", blocking: true },
          ],
        }}
      />,
    );
    expect(actions().map((input) => (input as HTMLInputElement).value)).toEqual(["Open", "Tap"]);
    expect(screen.getAllByRole("checkbox", { name: /blocks testing/i })[1]).toBeChecked();
  });

  it("starts a required list with one blank row, or minItems rows", () => {
    const steps = listSchema.fields[1] as Extract<AppSchema["fields"][number], { type: "list" }>;
    const { unmount } = render(
      <SchemaForm schema={{ ...listSchema, fields: [{ ...steps, required: true }] }} action={noop} />,
    );
    expect(actions()).toHaveLength(1);
    unmount();
    render(<SchemaForm schema={{ ...listSchema, fields: [{ ...steps, minItems: 2 }] }} action={noop} />);
    expect(actions()).toHaveLength(2);
  });

  it("attaches a returned row error to its control, lists it in the summary, and keeps other values", async () => {
    const action = vi.fn(async (): Promise<RecordFormState> => ({
      errors: { title: "Title is required", "steps.1.action": "What you did is required" },
    }));
    render(<SchemaForm schema={listSchema} action={action} />);
    await userEvent.click(add());
    await userEvent.click(add());
    await userEvent.type(actions()[0], "kept");
    await userEvent.click(screen.getAllByRole("checkbox", { name: /blocks testing/i })[1]);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(action).toHaveBeenCalled());

    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Please fix 2 fields");
    expect(summary).toHaveFocus();

    const second = actions()[1];
    expect(second).toBeInvalid();
    expect(second).toHaveAccessibleDescription("What you did is required");
    expect(actions()[0]).not.toBeInvalid();
    const link = screen.getByRole("link", { name: "What you did is required" });
    expect(link).toHaveAttribute("href", `#${second.id}`);

    expect(actions()[0]).toHaveValue("kept");
    expect(screen.getAllByRole("checkbox", { name: /blocks testing/i })[1]).toBeChecked();
  });

  it("keeps a row error on its row when an earlier row is removed", async () => {
    const action = vi.fn(async (): Promise<RecordFormState> => ({
      errors: { "steps.1.action": "What you did is required" },
    }));
    render(<SchemaForm schema={listSchema} action={action} />);
    await userEvent.click(add());
    await userEvent.click(add());
    await userEvent.type(actions()[0], "first");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await screen.findByRole("alert");

    await userEvent.click(screen.getByRole("button", { name: "Remove Step 1" }));

    expect(actions()).toHaveLength(1);
    expect(actions()[0]).toBeInvalid();
    expect(actions()[0]).toHaveAccessibleDescription("What you did is required");
  });

  it("shows a list-level error on the group and links it to the Add button", async () => {
    const action = vi.fn(async (): Promise<RecordFormState> => ({
      errors: { steps: "Steps to reproduce is required" },
    }));
    render(<SchemaForm schema={listSchema} action={action} />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await screen.findByRole("alert");

    expect(screen.getByRole("group", { name: /steps to reproduce/i })).toHaveAccessibleDescription(
      "One action per step. Steps to reproduce is required",
    );
    expect(screen.getByRole("link", { name: "Steps to reproduce is required" })).toHaveAttribute(
      "href",
      `#${add().id}`,
    );
  });

  it("has no detectable accessibility violations with two rows", async () => {
    const { container } = render(<SchemaForm schema={listSchema} action={noop} />);
    await userEvent.click(add());
    await userEvent.click(add());
    expect(await axe(container)).toHaveNoViolations();
  });
});
