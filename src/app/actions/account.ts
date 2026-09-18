"use server";

// Lets a signed-in user change their own password.
//
// The account is always taken from the session, never from the form, so a user
// cannot aim this at somebody else's row by editing the request.
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type ChangePasswordState = { error?: string; success?: boolean };

// Matches the rule in docs/backlog.md. Long minimum, no composition rules:
// length is what actually resists guessing.
const MIN_LENGTH = 12;

export async function changePassword(
  _previous: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireUser();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  // The cheap checks run first: they need no database round trip and no
  // hashing. Each message names the one thing that is wrong, so the user is
  // never left guessing which field to fix.
  if (newPassword.length < MIN_LENGTH) {
    return { error: `New password must be at least ${MIN_LENGTH} characters.` };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation do not match." };
  }
  if (newPassword === currentPassword) {
    return { error: "New password must be different from your current password." };
  }

  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  // requireUser already proved this row exists, so this is only here to satisfy
  // the type. Treat it as a server fault rather than a password problem.
  if (!record) {
    return { error: "Your account could not be loaded. Please sign in again." };
  }

  // The stored value is a bcrypt hash, so the only way to check the old
  // password is to hash the attempt with the same salt. bcrypt.compare does
  // that, and compares in constant time.
  const matches = await bcrypt.compare(currentPassword, record.passwordHash);
  if (!matches) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Deliberately returns nothing but a flag. The state object travels back to
  // the browser, so it must never carry a password or a hash.
  return { success: true };
}
