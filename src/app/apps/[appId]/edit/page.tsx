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
import { ApplicationForm } from "@/components/application-form";

type Props = {
  params: Promise<{ appId: string }>;
  searchParams: Promise<{ saved?: string; published?: string; unpublished?: string; restored?: string; blocked?: string }>;
};

export const metadata: Metadata = { title: "Edit application" };

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
      published: true,
      archivedAt: true,
      _count: { select: { records: true } },
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
          {!archived && app.published && (
            <p className="text-xs text-ink-muted">Unpublish to archive or delete.</p>
          )}
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
          }}
          submitLabel="Save changes"
          slugFollowsName={false}
        />
      </div>
    </div>
  );
}
