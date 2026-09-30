import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, updateMany, revalidatePath } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  updateMany: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireUser }));
vi.mock("@/lib/db", () => ({
  db: { user: { updateMany } },
}));
vi.mock("next/cache", () => ({ revalidatePath }));

import { setAnalystActive } from "./admin";

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