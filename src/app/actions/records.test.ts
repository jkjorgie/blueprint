// Security tests for response update/delete actions.
// These verify that a response ID must belong to the application being accessed.

import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, getAppForUser, findFirst, update, deleteRecord } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getAppForUser: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  deleteRecord: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireUser }));

vi.mock("@/lib/apps", () => ({ getAppForUser }));

vi.mock("@/lib/db", () => ({
  db: {
    dataRecord: {
      findFirst,
      update,
      delete: deleteRecord,
    },
  },
}));

import { updateRecord, deleteRecord as deleteResponse } from "./records";

const user = { id: "user-1" };

const app = {
  id: "app-1",
  schema: {
    title: "Bug Reports",
    fields: [
      {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
      },
    ],
  },
  archived: false,
  permissions: { view: true, create: true, edit: true, delete: true, scope: "all" },
};

describe("response server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireUser.mockResolvedValue(user);
    getAppForUser.mockResolvedValue(app);
  });

  it("refuses to update a response from another application", async () => {
    findFirst.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("title", "Changed");

    const result = await updateRecord("app-1", "response-from-other-app", {}, formData);

    expect(result).toEqual({ formError: "Response not found." });
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses to update a response on an archived application", async () => {
    getAppForUser.mockResolvedValue({ ...app, archived: true });
    findFirst.mockResolvedValue({ id: "r1" });

    const formData = new FormData();
    formData.set("title", "Changed");
    const result = await updateRecord("app-1", "r1", {}, formData);

    expect(result.formError).toMatch(/archived/);
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses to delete a response on an archived application", async () => {
    getAppForUser.mockResolvedValue({ ...app, archived: true });
    findFirst.mockResolvedValue({ id: "r1" });

    await deleteResponse("app-1", "r1");

    expect(deleteRecord).not.toHaveBeenCalled();
  });

  it("refuses to delete a response from another application", async () => {
    findFirst.mockResolvedValue(null);

    await deleteResponse("app-1", "response-from-other-app");

    expect(deleteRecord).not.toHaveBeenCalled();
  });

  it("refuses to update when the role lacks edit", async () => {
    getAppForUser.mockResolvedValue({
      ...app,
      permissions: { view: true, create: true, edit: false, delete: false, scope: "own" },
    });
    findFirst.mockResolvedValue({ id: "r1" });

    const formData = new FormData();
    formData.set("title", "Changed");
    const result = await updateRecord("app-1", "r1", {}, formData);

    expect(result.formError).toMatch(/role/);
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses to delete when the role lacks delete", async () => {
    getAppForUser.mockResolvedValue({
      ...app,
      permissions: { view: true, create: true, edit: true, delete: false, scope: "all" },
    });
    findFirst.mockResolvedValue({ id: "r1" });

    await deleteResponse("app-1", "r1");

    expect(deleteRecord).not.toHaveBeenCalled();
  });

  it("only looks up the member's own response when the scope is own", async () => {
    getAppForUser.mockResolvedValue({
      ...app,
      permissions: { view: true, create: true, edit: true, delete: true, scope: "own" },
    });
    findFirst.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("title", "Changed");
    await updateRecord("app-1", "r1", {}, formData);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r1", applicationId: "app-1", createdById: "user-1" } }),
    );
    expect(update).not.toHaveBeenCalled();
  });
});
