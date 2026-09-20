// Tests for the change-password action.
//
// The session, the database, and bcrypt are all stubbed, so these run with no
// .env and cannot touch the shared Supabase database. What is being pinned down
// is the decision logic: which message comes back for which mistake, and
// whether the row is written at all.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, findUnique, update, compare, hash } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  compare: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireUser }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique, update } } }));
// bcryptjs is consumed as a default import, so the mock needs a default key.
vi.mock("bcryptjs", () => ({ default: { compare, hash } }));

import { changePassword } from "./account";

const VALID = "correct-horse-battery";
const CURRENT = "password123";

function form(fields: { current?: string; next?: string; confirm?: string }) {
  const data = new FormData();
  data.set("currentPassword", fields.current ?? CURRENT);
  data.set("newPassword", fields.next ?? VALID);
  data.set("confirmPassword", fields.confirm ?? fields.next ?? VALID);
  return data;
}

describe("changePassword", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUser.mockResolvedValue({ id: "user-1", email: "user@blueprint.local" });
    findUnique.mockResolvedValue({ passwordHash: "stored-hash" });
    compare.mockResolvedValue(true);
    hash.mockResolvedValue("new-hash");
  });

  it("rejects a new password shorter than 12 characters", async () => {
    const result = await changePassword({}, form({ next: "short123" }));

    expect(result.error).toMatch(/12 characters/);
    // Nothing is written, and the stored hash is never even read.
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a confirmation that does not match", async () => {
    const result = await changePassword({}, form({ next: VALID, confirm: "something-else-entirely" }));

    expect(result.error).toBe("New password and confirmation do not match.");
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects reusing the current password", async () => {
    const result = await changePassword({}, form({ current: VALID, next: VALID }));

    expect(result.error).toMatch(/different/i);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects an incorrect current password without writing anything", async () => {
    compare.mockResolvedValue(false);

    const result = await changePassword({}, form({}));

    expect(result.error).toBe("Current password is incorrect.");
    // The important half of this test: a wrong current password must not
    // leave the account with a new one.
    expect(update).not.toHaveBeenCalled();
  });

  it("hashes and stores the new password when everything checks out", async () => {
    const result = await changePassword({}, form({}));

    expect(result).toEqual({ success: true });
    expect(compare).toHaveBeenCalledWith(CURRENT, "stored-hash");
    expect(hash).toHaveBeenCalledWith(VALID, 10);
    expect(update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "new-hash" },
    });
  });

  it("acts on the session user, never on a value from the form", async () => {
    const data = form({});
    // A crafted request trying to aim the update at another account.
    data.set("userId", "someone-else");

    await changePassword({}, data);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-1" } }));
  });

  it("never returns a password or a hash to the browser", async () => {
    const ok = await changePassword({}, form({}));
    const bad = await changePassword({}, form({ next: "short" }));

    for (const state of [ok, bad]) {
      const serialised = JSON.stringify(state);
      expect(serialised).not.toContain(VALID);
      expect(serialised).not.toContain(CURRENT);
      expect(serialised).not.toContain("hash");
    }
  });
});
