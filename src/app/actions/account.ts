"use server";

// Lets a signed-in user change their own password. The account always comes from
// the session, never the form, so a request cannot target someone else.

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type ChangePasswordState = { error?: string; success?: boolean };

const MIN_LENGTH = 12;

export async function changePassword(_previous: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const user = await requireUser();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

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
  if (!record) {
    return { error: "Your account could not be loaded. Please sign in again." };
  }

  const matches = await bcrypt.compare(currentPassword, record.passwordHash);
  if (!matches) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { success: true };
}
