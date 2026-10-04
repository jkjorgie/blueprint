"use server";

// Roles are named permission bundles an analyst defines per application.
// The edit page creates and deletes them; the role edit page changes one.
// Every action confirms the analyst owns the application.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { readRoleForm } from "@/lib/schema/role-form";

export type RoleFormState = { error?: string };

const NAME_TAKEN = "This application already has a role with that name.";

// Bound in the edit page as createRole.bind(null, app.id) for the add form.
export async function createRole(
  applicationId: string,
  _previous: RoleFormState,
  formData: FormData,
): Promise<RoleFormState> {
  const analyst = await requireUser(["ANALYST"]);

  const owned = await db.application.findFirst({
    where: { id: applicationId, ownerId: analyst.id },
    select: { id: true },
  });
  if (!owned) return { error: "This application does not exist or is not yours." };

  const parsed = readRoleForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const clash = await db.appRole.findFirst({
    where: { applicationId, name: parsed.data.name },
    select: { id: true },
  });
  if (clash) return { error: NAME_TAKEN };

  await db.appRole.create({ data: { applicationId, ...parsed.data } });

  revalidatePath(`/apps/${applicationId}/edit`);
  revalidatePath("/users");
  redirect(`/apps/${applicationId}/edit?roleAdded=1`);
}

// Bound in the edit page as deleteRole.bind(null, app.id, role.id) and used as
// a plain <form action>. A role still assigned to members is refused rather
// than silently dropping those members back to the default permissions.
export async function deleteRole(applicationId: string, roleId: string) {
  const analyst = await requireUser(["ANALYST"]);

  const role = await db.appRole.findFirst({
    where: { id: roleId, applicationId, application: { ownerId: analyst.id } },
    select: { id: true, _count: { select: { memberships: true } } },
  });
  if (!role) redirect("/dashboard");
  if (role._count.memberships > 0) redirect(`/apps/${applicationId}/edit?blocked=role`);

  // The membership check is repeated in the delete itself, so a member
  // assigned in the same instant is not quietly unassigned.
  const result = await db.appRole.deleteMany({ where: { id: role.id, memberships: { none: {} } } });
  if (result.count === 0) redirect(`/apps/${applicationId}/edit?blocked=role`);

  revalidatePath(`/apps/${applicationId}/edit`);
  revalidatePath("/users");
  redirect(`/apps/${applicationId}/edit?roleDeleted=1`);
}

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
  if (clash) return { error: NAME_TAKEN };

  await db.appRole.update({ where: { id: role.id }, data: parsed.data });

  revalidatePath(`/apps/${role.applicationId}/edit`);
  revalidatePath("/users");
  redirect(`/apps/${role.applicationId}/edit?roleSaved=1`);
}
