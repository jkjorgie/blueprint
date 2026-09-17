// Unit tests for the end-user dashboard list.
//
// These run without a database. MemberApps is given fake rows in the shape
// Prisma would return, which keeps the tests fast, deterministic, and safe to
// run against a machine with no .env. It also lets us cover states the seeded
// data cannot produce, such as a user with no memberships.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";

// vi.hoisted is required here. Vitest moves vi.mock calls above the imports so
// the mock is in place before the module under test loads. A plain `const
// findMany = vi.fn()` would still be uninitialized at that point, and the
// factory below would throw. vi.hoisted lifts the variable with it.
const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

// Replace the real Prisma client with a stub. Without this the import chain
// reaches src/lib/db.ts, which opens a real connection pool to the shared
// Supabase database.
vi.mock("@/lib/db", () => ({ db: { appMembership: { findMany } } }));

import { MemberApps } from "./member-apps";

// Mirrors the seeded "Bug Reports" app, so a passing test reflects what the
// analyst actually sees in the running app.
const bugReports = {
  application: { id: "app-1", name: "Bug Reports", description: "Tell us what broke." },
};
// description is nullable in the schema, so one fixture exercises the null path.
const noDescription = {
  application: { id: "app-2", name: "Event RSVPs", description: null },
};

describe("MemberApps", () => {
  // Reset between tests so a return value set by one test cannot leak into the
  // next and make a broken test pass.
  beforeEach(() => findMany.mockReset());

  it("lists each application the user is a member of", async () => {
    findMany.mockResolvedValue([bugReports]);

    // MemberApps is async, so await it and hand the resolved JSX to render.
    render(await MemberApps({ userId: "user-1" }));

    // Queried by role rather than CSS class: this asserts the name is a real
    // link pointing at the right app, which is what a user and a screen reader
    // both depend on. A class assertion would pass even if it were a <span>.
    expect(screen.getByRole("link", { name: "Bug Reports" })).toHaveAttribute("href", "/apps/app-1");
    expect(screen.getByText("Tell us what broke.")).toBeInTheDocument();
  });

  it("omits the description when the application has none", async () => {
    findMany.mockResolvedValue([noDescription]);

    render(await MemberApps({ userId: "user-1" }));

    expect(screen.getByRole("link", { name: "Event RSVPs" })).toBeInTheDocument();
    // Exact text content, so an empty <p> left behind by a missing guard would
    // fail this assertion rather than slip through unnoticed.
    expect(screen.getByRole("listitem").textContent).toBe("Event RSVPs");
  });

  it("asks only for the signed-in user's published applications", async () => {
    findMany.mockResolvedValue([]);

    await MemberApps({ userId: "user-1" });

    // The most important test in this file. Drafts leaking to end users is the
    // one failure a reviewer cannot catch by clicking around, because every
    // seeded app is already published. Asserting on the query itself is the
    // only way to prove the filter is there.
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", application: { published: true } },
      }),
    );
  });

  it("shows the empty state when the user has no memberships", async () => {
    findMany.mockResolvedValue([]);

    render(await MemberApps({ userId: "user-1" }));

    expect(screen.getByText("You have not been added to any applications yet.")).toBeInTheDocument();
    // Also assert no list is rendered: the empty state should replace the <ul>,
    // not sit next to an empty one.
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    // Both fixtures, so axe sees a card with a description and one without.
    findMany.mockResolvedValue([bugReports, noDescription]);

    const { container } = render(await MemberApps({ userId: "user-1" }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
