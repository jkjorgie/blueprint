"use server";

// Analysts manage their own end users: create, activate, and grant application access.
// Every action confirms the user and the applications belong to the analyst.

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type UserFormState = { error?: string; success?: boolean; name?: string };

const MIN_PASSWORD = 12;

const newUser = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80, "Name must be 80 characters or fewer."),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  temporaryPassword: z.string().min(MIN_PASSWORD, `Temporary password must be at least ${MIN_PASSWORD} characters.`),
});

export async function createEndUser(_previous: UserFormState, formData: FormData): Promise<UserFormState> {
  const analyst = await requireUser(["ANALYST"]);

  const parsed = newUser.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    temporaryPassword: formData.get("temporaryPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const taken = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (taken) return { error: "An account with that email already exists." };

  const passwordHash = await bcrypt.hash(parsed.data.temporaryPassword, 10);
  const created = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "END_USER",
      managedById: analyst.id,
    },
    select: { name: true },
  });

  revalidatePath("/users");
  redirect(`/users?created=${encodeURIComponent(created.name)}`);
}

export async function setEndUserActive(userId: string, active: boolean) {
  const analyst = await requireUser(["ANALYST"]);
  await db.user.updateMany({
    where: { id: userId, role: "END_USER", managedById: analyst.id },
    data: { active },
  });
  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
}

// Reconciles memberships with the submitted checkboxes in one transaction.
// A role is only accepted if it belongs to that application.
export async function saveUserAccess(
  userId: string,
  _previous: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const analyst = await requireUser(["ANALYST"]);

  const managed = await db.user.findFirst({
    where: { id: userId, role: "END_USER", managedById: analyst.id },
    select: { id: true },
  });
  if (!managed) return { error: "This user is not one of yours." };

  const apps = await db.application.findMany({
    where: { ownerId: analyst.id, archivedAt: null },
    select: { id: true, roles: { select: { id: true } } },
  });

  const writes = apps.map((app) => {
    const member = formData.get(`member-${app.id}`) === "on";
    if (!member) {
      return db.appMembership.deleteMany({ where: { userId, applicationId: app.id } });
    }
    const requestedRole = formData.get(`role-${app.id}`);
    const roleId =
      typeof requestedRole === "string" && app.roles.some((r) => r.id === requestedRole) ? requestedRole : null;
    return db.appMembership.upsert({
      where: { userId_applicationId: { userId, applicationId: app.id } },
      update: { roleId },
      create: { userId, applicationId: app.id, roleId },
    });
  });
  await db.$transaction(writes);

  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
