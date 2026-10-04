// The session, database, and navigation are stubbed; these tests pin down the decision logic.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, appFindFirst, findFirst, create, update, deleteMany, redirect } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  appFindFirst: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

vi.mock("@/lib/session", () => ({ requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/db", () => ({
  db: { application: { findFirst: appFindFirst }, appRole: { findFirst, create, update, deleteMany } },
}));

import { createRole, deleteRole, updateRole } from "./roles";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "analyst-1", role: "ANALYST" });
});

describe("updateRole", () => {
  it("refuses a role on an application the analyst does not own", async () => {
    findFirst.mockResolvedValueOnce(null);
    const result = await updateRole("role-1", {}, form({ name: "Viewer" }));
    expect(result.error).toMatch(/not yours/);
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses a name already used by another role in the same application", async () => {
    findFirst.mockResolvedValueOnce({ id: "role-1", applicationId: "app-1" }).mockResolvedValueOnce({ id: "role-2" });
    const result = await updateRole("role-1", {}, form({ name: "Viewer", canView: "on" }));
    expect(result.error).toMatch(/already has a role/);
    expect(update).not.toHaveBeenCalled();
  });

  it("saves the four flags from checkboxes and returns to the edit page", async () => {
    findFirst.mockResolvedValueOnce({ id: "role-1", applicationId: "app-1" }).mockResolvedValueOnce(null);
    await expect(
      updateRole("role-1", {}, form({ name: "Editor", canView: "on", canCreate: "on", canEdit: "on" })),
    ).rejects.toThrow("REDIRECT /apps/app-1/edit?roleSaved=1");
    expect(update).toHaveBeenCalledWith({
      where: { id: "role-1" },
      data: { name: "Editor", canView: true, canCreate: true, canEdit: true, canDelete: false, allResponses: false },
    });
  });
});

describe("createRole", () => {
  it("refuses an application the analyst does not own", async () => {
    appFindFirst.mockResolvedValueOnce(null);
    const result = await createRole("app-1", {}, form({ name: "Viewer", canView: "on" }));
    expect(result.error).toMatch(/not yours/);
    expect(appFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "app-1", ownerId: "analyst-1" } }),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a name already used by a role in the same application", async () => {
    appFindFirst.mockResolvedValueOnce({ id: "app-1" });
    findFirst.mockResolvedValueOnce({ id: "role-2" });
    const result = await createRole("app-1", {}, form({ name: "Viewer", canView: "on" }));
    expect(result.error).toMatch(/already has a role/);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { applicationId: "app-1", name: "Viewer" } }),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("stores the flags from checkboxes and returns to the edit page", async () => {
    appFindFirst.mockResolvedValueOnce({ id: "app-1" });
    findFirst.mockResolvedValueOnce(null);
    await expect(
      createRole("app-1", {}, form({ name: "Editor", canView: "on", canCreate: "on", canEdit: "on" })),
    ).rejects.toThrow("REDIRECT /apps/app-1/edit?roleAdded=1");
    expect(create).toHaveBeenCalledWith({
      data: {
        applicationId: "app-1",
        name: "Editor",
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        allResponses: false,
      },
    });
  });
});

describe("deleteRole", () => {
  it("refuses a role on an application the analyst does not own", async () => {
    findFirst.mockResolvedValueOnce(null);
    await expect(deleteRole("app-1", "role-1")).rejects.toThrow("REDIRECT /dashboard");
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "role-1", applicationId: "app-1", application: { ownerId: "analyst-1" } },
      }),
    );
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("refuses to delete a role assigned to users", async () => {
    findFirst.mockResolvedValueOnce({ id: "role-1", _count: { memberships: 2 } });
    await expect(deleteRole("app-1", "role-1")).rejects.toThrow("REDIRECT /apps/app-1/edit?blocked=role");
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("deletes an unassigned role and returns to the edit page", async () => {
    findFirst.mockResolvedValueOnce({ id: "role-1", _count: { memberships: 0 } });
    deleteMany.mockResolvedValueOnce({ count: 1 });
    await expect(deleteRole("app-1", "role-1")).rejects.toThrow("REDIRECT /apps/app-1/edit?roleDeleted=1");
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "role-1", memberships: { none: {} } } });
  });

  it("refuses when a user is assigned between the check and the delete", async () => {
    findFirst.mockResolvedValueOnce({ id: "role-1", _count: { memberships: 0 } });
    deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(deleteRole("app-1", "role-1")).rejects.toThrow("REDIRECT /apps/app-1/edit?blocked=role");
  });
});
