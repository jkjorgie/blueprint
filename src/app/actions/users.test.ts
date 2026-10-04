// The session, database, and navigation are stubbed; these tests pin down the decision logic.
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUser,
  userFindUnique,
  userFindFirst,
  userCreate,
  userUpdateMany,
  appFindMany,
  membershipUpsert,
  membershipDeleteMany,
  transaction,
  hash,
} = vi.hoisted(() => ({
  requireUser: vi.fn(),
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  userCreate: vi.fn(),
  userUpdateMany: vi.fn(),
  appFindMany: vi.fn(),
  membershipUpsert: vi.fn((args: unknown) => ({ kind: "upsert", args })),
  membershipDeleteMany: vi.fn((args: unknown) => ({ kind: "delete", args })),
  transaction: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));
vi.mock("bcryptjs", () => ({ default: { hash } }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: userFindUnique, findFirst: userFindFirst, create: userCreate, updateMany: userUpdateMany },
    application: { findMany: appFindMany },
    appMembership: { upsert: membershipUpsert, deleteMany: membershipDeleteMany },
    $transaction: transaction,
  },
}));

import { createEndUser, saveUserAccess, setEndUserActive } from "./users";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "analyst-1", role: "ANALYST" });
  userFindUnique.mockResolvedValue(null);
  userCreate.mockResolvedValue({ name: "Dana" });
  hash.mockResolvedValue("hashed");
});

describe("createEndUser", () => {
  it("refuses a short temporary password", async () => {
    const result = await createEndUser({}, form({ name: "Dana", email: "dana@x.com", temporaryPassword: "short" }));
    expect(result.error).toMatch(/12 characters/);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("refuses a duplicate email", async () => {
    userFindUnique.mockResolvedValue({ id: "someone" });
    const result = await createEndUser(
      {},
      form({ name: "Dana", email: "dana@x.com", temporaryPassword: "long-enough-password" }),
    );
    expect(result.error).toMatch(/already exists/);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it("creates an end user managed by the analyst with a hashed password", async () => {
    await expect(
      createEndUser({}, form({ name: "Dana", email: "Dana@X.com", temporaryPassword: "long-enough-password" })),
    ).rejects.toThrow("REDIRECT /users?created=Dana");
    expect(hash).toHaveBeenCalledWith("long-enough-password", 10);
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "dana@x.com",
          role: "END_USER",
          managedById: "analyst-1",
          passwordHash: "hashed",
        }),
      }),
    );
  });
});

describe("setEndUserActive", () => {
  it("only touches end users managed by this analyst", async () => {
    await setEndUserActive("user-9", false);
    expect(userUpdateMany).toHaveBeenCalledWith({
      where: { id: "user-9", role: "END_USER", managedById: "analyst-1" },
      data: { active: false },
    });
  });
});

describe("saveUserAccess", () => {
  it("refuses a user the analyst does not manage", async () => {
    userFindFirst.mockResolvedValue(null);
    const result = await saveUserAccess("user-9", {}, form({}));
    expect(result.error).toMatch(/not one of yours/);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("adds memberships for checked apps, removes unchecked ones, and ignores roles from other apps", async () => {
    userFindFirst.mockResolvedValue({ id: "user-1" });
    appFindMany.mockResolvedValue([
      { id: "app-1", roles: [{ id: "role-a" }] },
      { id: "app-2", roles: [] },
    ]);
    const result = await saveUserAccess(
      "user-1",
      {},
      form({ "member-app-1": "on", "role-app-1": "role-from-elsewhere" }),
    );

    expect(result).toEqual({ success: true });
    expect(membershipUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { userId: "user-1", applicationId: "app-1", roleId: null } }),
    );
    expect(membershipDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1", applicationId: "app-2" } });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("assigns a role that belongs to the application", async () => {
    userFindFirst.mockResolvedValue({ id: "user-1" });
    appFindMany.mockResolvedValue([{ id: "app-1", roles: [{ id: "role-a" }] }]);
    await saveUserAccess("user-1", {}, form({ "member-app-1": "on", "role-app-1": "role-a" }));
    expect(membershipUpsert).toHaveBeenCalledWith(expect.objectContaining({ update: { roleId: "role-a" } }));
  });
});
