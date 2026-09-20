// The session, database, and Next.js navigation are stubbed. What these pin
// down is the decision logic: who may do what, and what comes back to the form.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STARTER_SCHEMA_JSON } from "@/lib/schema/application-form";

const { requireUser, findUnique, findFirst, create, update, updateMany, deleteMany, redirect, revalidatePath } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireUser }));
vi.mock("@/lib/db", () => ({ db: { application: { findUnique, findFirst, create, update, updateMany, deleteMany } } }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));

import {
  archiveApplication,
  createApplication,
  deleteApplication,
  publishApplication,
  restoreApplication,
  updateApplication,
} from "./applications";

function form(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("name", "Feedback");
  fd.set("slug", "feedback");
  fd.set("description", "");
  fd.set("schemaJson", STARTER_SCHEMA_JSON);
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "analyst-1", role: "ANALYST" });
  findUnique.mockResolvedValue(null);
  findFirst.mockResolvedValue(null);
  create.mockResolvedValue({ id: "app-1" });
  updateMany.mockResolvedValue({ count: 1 });
  deleteMany.mockResolvedValue({ count: 1 });
});

describe("createApplication", () => {
  it("requires the analyst role", async () => {
    await createApplication({}, form()).catch(() => {});
    expect(requireUser).toHaveBeenCalledWith(["ANALYST"]);
  });

  it("returns field errors and the typed values instead of saving", async () => {
    const result = await createApplication({}, form({ name: "", schemaJson: "{ nope" }));
    expect(result.errors?.name).toBe("Name is required.");
    expect(result.errors?.schema?.[0]).toMatch(/^Invalid JSON/);
    expect(result.values?.schemaJson).toBe("{ nope");
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a slug the analyst already uses", async () => {
    findUnique.mockResolvedValue({ id: "existing" });
    const result = await createApplication({}, form());
    expect(result.errors?.slug).toMatch(/already have/);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a draft owned by the analyst and redirects to it", async () => {
    await expect(createApplication({}, form())).rejects.toThrow("REDIRECT /apps/app-1");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: "analyst-1", slug: "feedback", name: "Feedback" }),
      }),
    );
    // No published flag in the data means the schema default (false) applies.
    expect(create.mock.calls[0][0].data.published).toBeUndefined();
  });
});

describe("updateApplication", () => {
  it("refuses to touch an application the analyst does not own", async () => {
    findFirst.mockResolvedValueOnce(null);
    const result = await updateApplication("app-9", {}, form());
    expect(result.formError).toMatch(/not yours/);
    expect(update).not.toHaveBeenCalled();
  });

  it("saves and redirects back to the edit page", async () => {
    findFirst.mockResolvedValueOnce({ id: "app-1" }).mockResolvedValueOnce(null);
    await expect(updateApplication("app-1", {}, form({ name: "Renamed" }))).rejects.toThrow("REDIRECT /apps/app-1/edit?saved=1");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "app-1" }, data: expect.objectContaining({ name: "Renamed" }) }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/apps/app-1");
  });
});

describe("publishApplication", () => {
  it("only updates rows owned by the analyst", async () => {
    await publishApplication("app-1").catch(() => {});
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "app-1", ownerId: "analyst-1" },
      data: { published: true },
    });
  });

  it("sends a non-owner to the dashboard without publishing anything", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(publishApplication("app-9")).rejects.toThrow("REDIRECT /dashboard");
  });
});

describe("deleteApplication", () => {
  it("only deletes an owned, unpublished app with no responses, in one statement", async () => {
    await expect(deleteApplication("app-1")).rejects.toThrow("REDIRECT /dashboard?deleted=1");
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "app-1", ownerId: "analyst-1", published: false, records: { none: {} } },
    });
  });

  it("sends the analyst back to the edit page when the rule blocks it", async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    await expect(deleteApplication("app-1")).rejects.toThrow("REDIRECT /apps/app-1/edit?blocked=delete");
  });
});

describe("archiveApplication", () => {
  it("archives only an owned draft that is not already archived", async () => {
    await expect(archiveApplication("app-1")).rejects.toThrow("REDIRECT /dashboard?archived=1");
    const call = updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: "app-1", ownerId: "analyst-1", published: false, archivedAt: null });
    expect(call.data.archivedAt).toBeInstanceOf(Date);
  });

  it("is blocked for a published app", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(archiveApplication("app-1")).rejects.toThrow("REDIRECT /apps/app-1/edit?blocked=archive");
  });
});

describe("restoreApplication", () => {
  it("clears archivedAt on an owned archived app and returns to the edit page", async () => {
    await expect(restoreApplication("app-1")).rejects.toThrow("REDIRECT /apps/app-1/edit?restored=1");
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "app-1", ownerId: "analyst-1", archivedAt: { not: null } },
      data: { archivedAt: null },
    });
  });
});
