"use server";

// Roles are named permission bundles an analyst defines per application.
// Editing lives here; creating and deleting are added alongside in the role
// builder task. Every action confirms the analyst owns the application.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { readRoleForm } from "@/lib/schema/role-form";

export type RoleFormState = { error?: string };

export async function updateRole(roleId: string, _previous: RoleFormState, formData: FormData): Promise<RoleFormState> {
  const analyst = await requireUser(["ANALYST"]);

  const role = await db.appRole.findFirst({
    where: { id: roleId, application: { ownerId: analyst.id } },
    select: { id: true, applicationId: true },
  });
  if (!role) return { error: "This role does not exist or is not yours." };

  const parsed = readRoleForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const clash = await db.appRole.findFirst({
    where: { applicationId: role.applicationId, name: parsed.data.name, NOT: { id: role.id } },
    select: { id: true },
  });
  if (clash) return { error: "This application already has a role with that name." };

  await db.appRole.update({ where: { id: role.id }, data: parsed.data });

  revalidatePath(`/apps/${role.applicationId}/edit`);
  revalidatePath("/users");
  redirect(`/apps/${role.applicationId}/edit?roleSaved=1`);
}
