import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  archiveApplication,
  publishApplication,
  restoreApplication,
  unpublishApplication,
  updateApplication,
} from "@/app/actions/applications";
import { createRole, deleteRole } from "@/app/actions/roles";
import { ApplicationForm } from "@/components/application-form";
import { RoleForm, type RoleFormValues } from "@/components/role-form";
import { ROLE_PERMISSIONS } from "@/lib/schema/role-form";

type Props = {
  params: Promise<{ appId: string }>;
  searchParams: Promise<{
    saved?: string;
    published?: string;
    unpublished?: string;
    restored?: string;
    blocked?: string;
    roleSaved?: string;
    roleAdded?: string;
    roleDeleted?: string;
  }>;
};

export const metadata: Metadata = { title: "Edit application" };

const cell = "border-b border-line py-2 pr-4";

// Starts from the same defaults as the AppRole columns.
const NEW_ROLE: RoleFormValues = {
  name: "",
  canView: true,
  canCreate: true,
  canEdit: false,
  canDelete: false,
  allResponses: false,
};

export default async function EditApplicationPage({ params, searchParams }: Props) {
  const [{ appId }, flags] = await Promise.all([params, searchParams]);
  const user = await requireUser(["ANALYST"]);

  // Owner only. A member can use the app but never edit it.
  const app = await db.application.findFirst({
    where: { id: appId, ownerId: user.id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      schema: true,
      customCss: true,
      published: true,
      archivedAt: true,
      _count: { select: { records: true } },
      roles: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          allResponses: true,
        },
      },
    },
  });
  if (!app) notFound();

  const archived = app.archivedAt !== null;
  const responseCount = app._count.records;
  const status = flags.saved
    ? "Changes saved."
    : flags.published
      ? "Published. Your users can now see this application."
      : flags.unpublished
        ? "Unpublished. Only you can see this application now."
        : flags.restored
          ? "Restored as a draft."
          : flags.roleSaved
            ? "Role saved."
            : flags.roleAdded
              ? "Role added."
              : flags.roleDeleted
                ? "Role deleted."
                : flags.blocked === "role"
                  ? "This role is assigned to users and cannot be deleted. Change their role on the Manage users page first."
                  : flags.blocked === "delete"
                    ? "This application cannot be deleted. Only an unpublished draft with no responses can be deleted; archive it instead."
                    : flags.blocked === "archive"
                      ? "This application cannot be archived while it is published. Unpublish it first."
                      : null;
  const stateLabel = archived ? "Archived" : app.published ? "Published" : "Draft";

  return (
    <div className="container-page py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl">Edit {app.name}</h1>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={`/apps/${app.id}`} className="btn btn-secondary">
              Go to application
            </Link>
            <Link href={`/apps/${app.id}/responses`} className="btn btn-secondary">
              View responses
            </Link>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-sm text-ink-muted">
            {stateLabel} · {responseCount === 1 ? "1 response" : `${responseCount} responses`}
          </p>
          <div className="flex flex-wrap gap-2">
            {archived ? (
              <form action={restoreApplication.bind(null, app.id)}>
                <button type="submit" className="btn btn-primary">
                  Restore
                </button>
              </form>
            ) : app.published ? (
              <form action={unpublishApplication.bind(null, app.id)}>
                <button type="submit" className="btn btn-secondary">
                  Unpublish
                </button>
              </form>
            ) : (
              <>
                <form action={publishApplication.bind(null, app.id)}>
                  <button type="submit" className="btn btn-primary">
                    Publish
                  </button>
                </form>
                {responseCount === 0 ? (
                  <Link href={`/apps/${app.id}/delete`} className="btn btn-secondary">
                    Delete
                  </Link>
                ) : (
                  <form action={archiveApplication.bind(null, app.id)}>
                    <button type="submit" className="btn btn-secondary">
                      Archive
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
          {!archived && app.published && <p className="text-xs text-ink-muted">Unpublish to archive or delete.</p>}
        </div>
      </div>

      {status && (
        <p role="status" className={`notice mt-6 ${flags.blocked ? "notice-warning" : "notice-info"}`}>
          {status}
        </p>
      )}
      {archived && (
        <p className="mt-6 rounded-md border border-line bg-surface-muted p-3 text-sm text-ink-muted">
          This application is archived. Members cannot see it and it accepts no responses. Restore it to make changes
          take effect.
        </p>
      )}

      <div className="mt-8 max-w-2xl">
        <p className="mb-6 rounded-md border border-line bg-surface-muted p-3 text-sm text-ink-muted">
          Removing a field keeps the data already submitted for it. It just stops showing in the form and the responses
          table, and it comes back if you add the field again with the same name.
        </p>
        <ApplicationForm
          action={updateApplication.bind(null, app.id)}
          defaultValues={{
            name: app.name,
            slug: app.slug,
            description: app.description ?? "",
            schemaJson: JSON.stringify(app.schema, null, 2),
            customCss: app.customCss ?? "",
          }}
          submitLabel="Save changes"
          slugFollowsName={false}
        />
      </div>

      <section aria-labelledby="roles-heading" className="mt-12 max-w-3xl">
        <h2 id="roles-heading" className="text-xl">
          Roles
        </h2>
        <p className="mt-2 text-ink-muted">A member with no role can view and create their own responses only.</p>

        {app.roles.length === 0 ? (
          <p className="mt-4 text-ink-muted">This application has no roles yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Roles for {app.name}</caption>
              <thead>
                <tr>
                  <th scope="col" className={`${cell} font-medium`}>
                    Name
                  </th>
                  {ROLE_PERMISSIONS.map((column) => (
                    <th key={column.key} scope="col" className={`${cell} font-medium`}>
                      {column.label}
                    </th>
                  ))}
                  <th scope="col" className={`${cell} font-medium`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {app.roles.map((role) => (
                  <tr key={role.id}>
                    <th scope="row" className={`${cell} font-medium`}>
                      {role.name}
                    </th>
                    {ROLE_PERMISSIONS.map((column) => (
                      <td key={column.key} className={cell}>
                        {role[column.key] ? "Yes" : "No"}
                      </td>
                    ))}
                    <td className={cell}>
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          href={`/apps/${app.id}/roles/${role.id}/edit`}
                          className="underline"
                          aria-label={`Edit ${role.name}`}
                        >
                          Edit
                        </Link>
                        <form action={deleteRole.bind(null, app.id, role.id)}>
                          <button type="submit" className="underline" aria-label={`Delete ${role.name}`}>
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="mt-8 text-lg">Add role</h3>
        <div className="mt-4 max-w-md">
          <RoleForm action={createRole.bind(null, app.id)} defaultValues={NEW_ROLE} submitLabel="Add role" />
        </div>
      </section>
    </div>
  );
}
