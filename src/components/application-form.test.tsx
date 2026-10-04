import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { STARTER_SCHEMA_JSON, type ApplicationFormState } from "@/lib/schema/application-form";
import { ApplicationForm } from "./application-form";

const blank = { name: "", slug: "", description: "", schemaJson: STARTER_SCHEMA_JSON, customCss: "" };
const noop = async (): Promise<ApplicationFormState> => ({});

describe("ApplicationForm", () => {
  it("suggests a slug from the name until the slug is edited by hand", async () => {
    render(<ApplicationForm action={noop} defaultValues={blank} submitLabel="Create" />);
    const name = screen.getByRole("textbox", { name: "Name" });
    const slug = screen.getByRole("textbox", { name: "Slug" });

    await userEvent.type(name, "Bug Reports!");
    expect(slug).toHaveValue("bug-reports");

    await userEvent.clear(slug);
    await userEvent.type(slug, "bugs");
    await userEvent.type(name, " v2");
    expect(slug).toHaveValue("bugs");
  });

  it("does not overwrite an existing slug on the edit page", async () => {
    render(
      <ApplicationForm
        action={noop}
        defaultValues={{ ...blank, name: "Old", slug: "old" }}
        submitLabel="Save"
        slugFollowsName={false}
      />,
    );
    await userEvent.type(screen.getByRole("textbox", { name: "Name" }), " name");
    expect(screen.getByRole("textbox", { name: "Slug" })).toHaveValue("old");
  });

  it("lists every returned error in a focused summary and marks the fields", async () => {
    const action = vi.fn(async (): Promise<ApplicationFormState> => ({
      errors: {
        name: "Name is required.",
        schema: ["title: title is required", "fields: at least one field is required"],
      },
    }));
    render(<ApplicationForm action={action} defaultValues={blank} submitLabel="Create" />);

    await userEvent.type(screen.getByRole("textbox", { name: "Description" }), "kept");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(action).toHaveBeenCalled());

    const summary = await screen.findByRole("alert");
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent("Please fix 3 problems");
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInvalid();
    expect(screen.getByRole("textbox", { name: "Fields (JSON)" })).toBeInvalid();
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("kept");
  });

  it("shows a labelled Custom CSS box that names the app-theme wrapper", () => {
    render(
      <ApplicationForm
        action={noop}
        defaultValues={{ ...blank, customCss: "h1 { color: red; }" }}
        submitLabel="Save"
      />,
    );

    const css = screen.getByRole("textbox", { name: "Custom CSS" });
    expect(css).toHaveValue("h1 { color: red; }");
    expect(css).toHaveAttribute("name", "customCss");
    expect(css).toHaveAttribute("spellcheck", "false");
    expect(css).toHaveAccessibleDescription(/app-theme/);
  });

  it("marks the Custom CSS box and lists its error in the summary", async () => {
    const message = 'CSS cannot contain the sequence "</".';
    const action = vi.fn(async (): Promise<ApplicationFormState> => ({ errors: { customCss: message } }));
    render(<ApplicationForm action={action} defaultValues={blank} submitLabel="Save" />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(action).toHaveBeenCalled());

    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Please fix 1 problem");
    expect(screen.getByRole("link", { name: message })).toHaveAttribute("href", "#app-css");
    const css = screen.getByRole("textbox", { name: "Custom CSS" });
    expect(css).toBeInvalid();
    expect(css).toHaveAccessibleDescription(expect.stringContaining(message));
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<ApplicationForm action={noop} defaultValues={blank} submitLabel="Create" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
