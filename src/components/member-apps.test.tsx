// The session, database, and navigation are stubbed; these tests pin down the decision logic.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/db", () => ({ db: { appMembership: { findMany } } }));

import { MemberApps } from "./member-apps";

const bugReports = {
  application: { id: "app-1", name: "Bug Reports", description: "Tell us what broke." },
};
const noDescription = {
  application: { id: "app-2", name: "Event RSVPs", description: null },
};

describe("MemberApps", () => {
  beforeEach(() => findMany.mockReset());

  it("lists each application the user is a member of", async () => {
    findMany.mockResolvedValue([bugReports]);

    render(await MemberApps({ userId: "user-1" }));

    expect(screen.getByRole("link", { name: "Bug Reports" })).toHaveAttribute("href", "/apps/app-1");
    expect(screen.getByText("Tell us what broke.")).toBeInTheDocument();
  });

  it("omits the description when the application has none", async () => {
    findMany.mockResolvedValue([noDescription]);

    render(await MemberApps({ userId: "user-1" }));

    expect(screen.getByRole("link", { name: "Event RSVPs" })).toBeInTheDocument();
    expect(screen.getByRole("listitem").textContent).toBe("Event RSVPs");
  });

  it("asks only for the signed-in user's published applications", async () => {
    findMany.mockResolvedValue([]);

    await MemberApps({ userId: "user-1" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          application: { published: true, archivedAt: null },
          OR: [{ roleId: null }, { role: { canView: true } }],
        },
      }),
    );
  });

  it("shows the empty state when the user has no memberships", async () => {
    findMany.mockResolvedValue([]);

    render(await MemberApps({ userId: "user-1" }));

    expect(screen.getByText("You have not been added to any applications yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    findMany.mockResolvedValue([bugReports, noDescription]);

    const { container } = render(await MemberApps({ userId: "user-1" }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
