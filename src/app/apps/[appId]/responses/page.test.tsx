// The session, database, and navigation are stubbed; these tests pin down the decision logic.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import type { AppSchema } from "@/lib/schema/app-schema";

const { requireUser, getAppForUser, findMany, notFound } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getAppForUser: vi.fn(),
  findMany: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/lib/session", () => ({ requireUser }));
vi.mock("@/lib/apps", () => ({ getAppForUser }));
vi.mock("@/lib/db", () => ({ db: { dataRecord: { findMany } } }));
vi.mock("next/navigation", () => ({ notFound }));

import ResponsesPage from "./page";

const schema: AppSchema = {
  title: "Bug Reports",
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: false },
  ],
};

const rows = [
  {
    id: "r1",
    data: { title: "Save button does nothing on Safari", description: "Profile page." },
    createdAt: new Date("2026-09-01T10:00:00"),
  },
  {
    id: "r2",
    data: { title: "Typo on the welcome banner", description: "Welcom should be Welcome." },
    createdAt: new Date("2026-09-03T10:00:00"),
  },
];

async function renderPage(q?: string) {
  const ui = await ResponsesPage({
    params: Promise.resolve({ appId: "app-1" }),
    searchParams: Promise.resolve(q === undefined ? {} : { q }),
  });
  return render(ui);
}

describe("ResponsesPage search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: "user-1", email: "user@blueprint.local", role: "END_USER" });
    getAppForUser.mockResolvedValue({
      id: "app-1",
      name: "Bug Reports",
      schema,
      isOwner: false,
      archived: false,
      customCss: null,
      permissions: { view: true, create: true, edit: false, delete: false, scope: "all" },
    });
    findMany.mockResolvedValue(rows);
  });

  it("shows every response and no status line when there is no search", async () => {
    await renderPage();

    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search responses" })).toHaveValue("");
    expect(screen.queryByRole("link", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("submits as a GET form so the query lands in the URL", async () => {
    await renderPage();

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("method", "get");
    expect(form).not.toHaveAttribute("action");
    expect(screen.getByRole("searchbox")).toHaveAttribute("name", "q");
  });

  it("filters to matching rows and announces the count", async () => {
    await renderPage("safari");

    expect(screen.getByRole("status")).toHaveTextContent("1 response matches 'safari'");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("Save button does nothing on Safari")).toBeInTheDocument();
    expect(screen.queryByText("Typo on the welcome banner")).not.toBeInTheDocument();
  });

  it("matches regardless of case", async () => {
    await renderPage("SAFARI");

    expect(screen.getByRole("status")).toHaveTextContent("1 response matches 'SAFARI'");
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("keeps the query in the box and offers a way back to the full list", async () => {
    await renderPage("safari");

    expect(screen.getByRole("searchbox", { name: "Search responses" })).toHaveValue("safari");
    expect(screen.getByRole("link", { name: "Clear" })).toHaveAttribute("href", "/apps/app-1/responses");
  });

  it("shows a message instead of an empty table when nothing matches", async () => {
    await renderPage("banana");

    expect(screen.getByRole("status")).toHaveTextContent("No responses match 'banana'");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("No responses yet.")).not.toBeInTheDocument();
  });

  it("treats a query of only spaces as no search", async () => {
    await renderPage("   ");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("has no detectable accessibility violations with results", async () => {
    const { container } = await renderPage("safari");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no detectable accessibility violations with no matches", async () => {
    const { container } = await renderPage("banana");
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("ResponsesPage sorting", () => {
  async function renderWith(searchParams: Record<string, string>) {
    const ui = await ResponsesPage({
      params: Promise.resolve({ appId: "app-1" }),
      searchParams: Promise.resolve(searchParams),
    });
    return render(ui);
  }

  const titles = () =>
    screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.querySelector("td")?.textContent);

  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: "user-1", email: "user@blueprint.local", role: "END_USER" });
    getAppForUser.mockResolvedValue({
      id: "app-1",
      name: "Bug Reports",
      schema,
      isOwner: false,
      archived: false,
      customCss: null,
      permissions: { view: true, create: true, edit: false, delete: false, scope: "all" },
    });
    findMany.mockResolvedValue(rows);
  });

  it("keeps the database order when there is no sort", async () => {
    await renderWith({});
    expect(titles()).toEqual(["Save button does nothing on Safari", "Typo on the welcome banner"]);
  });

  it("sorts by the requested column and direction", async () => {
    await renderWith({ sort: "title", dir: "desc" });

    expect(titles()).toEqual(["Typo on the welcome banner", "Save button does nothing on Safari"]);
    expect(screen.getByRole("columnheader", { name: /Title/ })).toHaveAttribute("aria-sort", "descending");
  });

  it("flips the active column and starts other columns ascending", async () => {
    await renderWith({ sort: "title", dir: "asc" });

    expect(screen.getByRole("link", { name: "Title" })).toHaveAttribute(
      "href",
      "/apps/app-1/responses?sort=title&dir=desc",
    );
    expect(screen.getByRole("link", { name: "Submitted" })).toHaveAttribute(
      "href",
      "/apps/app-1/responses?sort=submitted&dir=asc",
    );
  });

  it("sorts the filtered list and keeps the search in every sort link", async () => {
    await renderWith({ q: "on", sort: "title", dir: "desc" });

    expect(screen.getByRole("status")).toHaveTextContent("2 responses match 'on'");
    expect(titles()).toEqual(["Typo on the welcome banner", "Save button does nothing on Safari"]);
    expect(screen.getByRole("link", { name: "Title" })).toHaveAttribute(
      "href",
      "/apps/app-1/responses?q=on&sort=title&dir=asc",
    );
    expect(screen.getByRole("link", { name: "Description" })).toHaveAttribute(
      "href",
      "/apps/app-1/responses?q=on&sort=description&dir=asc",
    );
  });

  it("ignores an unknown sort field instead of failing", async () => {
    await renderWith({ sort: "nope", dir: "asc" });

    expect(titles()).toEqual(["Save button does nothing on Safari", "Typo on the welcome banner"]);
    for (const header of screen.getAllByRole("columnheader")) {
      expect(header).not.toHaveAttribute("aria-sort");
    }
  });

  it("ignores a bad direction instead of failing", async () => {
    await renderWith({ sort: "title", dir: "sideways" });

    expect(titles()).toEqual(["Save button does nothing on Safari", "Typo on the welcome banner"]);
    expect(screen.getByRole("columnheader", { name: /Title/ })).not.toHaveAttribute("aria-sort");
  });

  it("has no detectable accessibility violations while sorted and filtered", async () => {
    const { container } = await renderWith({ q: "on", sort: "submitted", dir: "desc" });
    expect(await axe(container)).toHaveNoViolations();
  });
});
