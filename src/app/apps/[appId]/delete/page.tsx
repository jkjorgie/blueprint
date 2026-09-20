import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { deleteApplication } from "@/app/actions/applications";

export const metadata: Metadata = { title: "Delete application" };

type Props = { params: Promise<{ appId: string }> };

export default async function DeleteApplicationPage({ params }: Props) {
  const { appId } = await params;
  const user = await requireUser(["ANALYST"]);

  const app = await db.application.findFirst({
    where: { id: appId, ownerId: user.id },
    select: { id: true, name: true, published: true, _count: { select: { records: true } } },
  });
  if (!app) notFound();
  // Same rule the action enforces; this just avoids showing a page that
  // cannot succeed.
  if (app.published || app._count.records > 0) redirect(`/apps/${app.id}/edit?blocked=delete`);

  return (
    <div className="container-page py-12">
      <div className="max-w-xl">
        <h1 className="text-3xl">Delete {app.name}?</h1>
        <p className="mt-4 text-ink-muted">
          This permanently removes the application and its field definitions. It has no responses, so nothing else
          is lost. This cannot be undone.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <form action={deleteApplication.bind(null, app.id)}>
            <button type="submit" className="btn btn-danger">
              Delete application
            </button>
          </form>
          <Link href={`/apps/${app.id}/edit`} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
