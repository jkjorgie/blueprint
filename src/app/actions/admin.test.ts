import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, updateMany, findUnique, create, hash, revalidatePath } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  updateMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  hash: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireUser }));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      updateMany,
      findUnique,
      create,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath }));

import { createAnalyst, setAnalystActive } from "./admin";

describe("setAnalystActive", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    requireUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@blueprint.local",
      role: "ADMIN",
    });

    updateMany.mockResolvedValue({ count: 1 });
  });

  it("requires an administrator", async () => {
    await setAnalystActive("analyst-1", false);

    expect(requireUser).toHaveBeenCalledWith(["ADMIN"]);
  });

  it("filters the update to ANALYST users", async () => {
    await setAnalystActive("analyst-1", false);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "analyst-1",
        role: "ANALYST",
      },
      data: {
        active: false,
      },
    });
  });

  it("can reactivate an analyst", async () => {
    await setAnalystActive("analyst-1", true);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "analyst-1",
        role: "ANALYST",
      },
      data: {
        active: true,
      },
    });
  });

  it("revalidates the admin page", async () => {
    await setAnalystActive("analyst-1", false);

    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });
});

describe("createAnalyst", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    requireUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@blueprint.local",
      role: "ADMIN",
    });

    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "analyst-1" });
    hash.mockResolvedValue("hashed-password");
  });

  it("refuses a password shorter than 12 characters", async () => {
    const formData = new FormData();
    formData.set("name", "Jane Analyst");
    formData.set("email", "jane@example.com");
    formData.set("temporaryPassword", "short123");

    const result = await createAnalyst({}, formData);

    expect(result).toEqual({
      error: "Temporary password must be at least 12 characters.",
    });
    expect(findUnique).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a duplicate email", async () => {
    findUnique.mockResolvedValue({ id: "existing-user" });

    const formData = new FormData();
    formData.set("name", "Jane Analyst");
    formData.set("email", "JANE@EXAMPLE.COM");
    formData.set("temporaryPassword", "temporary-password");

    const result = await createAnalyst({}, formData);

    expect(result).toEqual({
      error: "An account with that email already exists.",
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "jane@example.com" },
      select: { id: true },
    });
    expect(hash).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("hashes the password and creates an ANALYST account", async () => {
    const formData = new FormData();
    formData.set("name", " Jane Analyst ");
    formData.set("email", " JANE@EXAMPLE.COM ");
    formData.set("temporaryPassword", "temporary-password");

    const result = await createAnalyst({}, formData);

    expect(hash).toHaveBeenCalledWith("temporary-password", 10);

    expect(create).toHaveBeenCalledWith({
      data: {
        name: "Jane Analyst",
        email: "jane@example.com",
        passwordHash: "hashed-password",
        role: "ANALYST",
      },
    });

    expect(revalidatePath).toHaveBeenCalledWith("/admin");

    expect(result).toEqual({
      success: true,
      name: "Jane Analyst",
    });
  });
});
