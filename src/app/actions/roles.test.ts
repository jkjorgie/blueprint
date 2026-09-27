import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, findFirst, update, redirect } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

vi.mock("@/lib/session", () => ({ requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/db", () => ({ db: { appRole: { findFirst, update } } }));

import { updateRole } from "./roles";

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
    await expect(updateRole("role-1", {}, form({ name: "Editor", canView: "on", canCreate: "on", canEdit: "on" }))).rejects.toThrow(
      "REDIRECT /apps/app-1/edit?roleSaved=1",
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: "role-1" },
      data: { name: "Editor", canView: true, canCreate: true, canEdit: true, canDelete: false, allResponses: false },
    });
  });
});
