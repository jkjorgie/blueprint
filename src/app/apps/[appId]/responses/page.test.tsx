// Render tests for the responses page's search. The session, the access check,
// and the database are stubbed, so these cover what the page shows for a given
// ?q= without a real request or the shared database.
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

// Builds the page for a given ?q= the way Next.js would call it.
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
    getAppForUser.mockResolvedValue({ id: "app-1", name: "Bug Reports", schema, isOwner: false });
    findMany.mockResolvedValue(rows);
  });

  it("shows every response and no status line when there is no search", async () => {
    await renderPage();

    // Header row plus both data rows.
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search responses" })).toHaveValue("");
    expect(screen.queryByRole("link", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("submits as a GET form so the query lands in the URL", async () => {
    await renderPage();

    const form = screen.getByRole("search");
    // A plain GET with no action is what puts ?q= in the address bar.
    expect(form).toHaveAttribute("method", "get");
    expect(form).not.toHaveAttribute("action");
    expect(screen.getByRole("searchbox")).toHaveAttribute("name", "q");
  });

  it("filters to matching rows and announces the count", async () => {
    await renderPage("safari");

    expect(screen.getByRole("status")).toHaveTextContent("1 response matches 'safari'");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    // Header row plus the single match.
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
    // The table's own empty state would be wrong here: responses do exist.
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
