"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type CreateAnalystState = {
  error?: string;
  success?: boolean;
  name?: string;
};

export async function setAnalystActive(userId: string, active: boolean) {
  await requireUser(["ADMIN"]);

  await db.user.updateMany({
    where: {
      id: userId,
      role: "ANALYST",
    },
    data: {
      active,
    },
  });

  revalidatePath("/admin");
}

export async function createAnalyst(_previous: CreateAnalystState, formData: FormData): Promise<CreateAnalystState> {
  await requireUser(["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const temporaryPassword = String(formData.get("temporaryPassword") ?? "");

  if (!name) {
    return { error: "Name is required." };
  }

  if (!email) {
    return { error: "Email is required." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  if (temporaryPassword.length < 12) {
    return { error: "Temporary password must be at least 12 characters." };
  }

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "ANALYST",
    },
  });

  revalidatePath("/admin");

  return { success: true, name };
}
