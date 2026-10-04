import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { updateRole } from "@/app/actions/roles";
import { RoleForm } from "@/components/role-form";

export const metadata: Metadata = { title: "Edit role" };

type Props = { params: Promise<{ appId: string; roleId: string }> };

export default async function EditRolePage({ params }: Props) {
  const { appId, roleId } = await params;
  const analyst = await requireUser(["ANALYST"]);

  const role = await db.appRole.findFirst({
    where: { id: roleId, applicationId: appId, application: { ownerId: analyst.id } },
    select: {
      id: true,
      name: true,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      allResponses: true,
      application: { select: { name: true } },
    },
  });
  if (!role) notFound();

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl">Edit role: {role.name}</h1>
      <p className="mt-2">
        <Link href={`/apps/${appId}/edit`} className="btn btn-secondary">
          Back to {role.application.name}
        </Link>
      </p>
      <div className="mt-8 max-w-md">
        <RoleForm action={updateRole.bind(null, role.id)} defaultValues={role} submitLabel="Save role" />
      </div>
    </div>
  );
}
