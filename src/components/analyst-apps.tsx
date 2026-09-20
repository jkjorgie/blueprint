// Dashboard section for business analysts: the applications they own.
// Active apps first with Edit and Go-to buttons; archived apps in a collapsed
// group at the bottom with a Restore button.
import Link from "next/link";
import { db } from "@/lib/db";
import { restoreApplication } from "@/app/actions/applications";

function responses(n: number) {
  return n === 1 ? "1 response" : `${n} responses`;
}

export async function AnalystApps({ userId }: { userId: string }) {
  const apps = await db.application.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      published: true,
      archivedAt: true,
      _count: { select: { records: true } },
    },
  });
  const active = apps.filter((app) => app.archivedAt === null);
  const archived = apps.filter((app) => app.archivedAt !== null);

  return (
    <section aria-labelledby="my-apps-heading" className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="my-apps-heading" className="text-xl">
          My applications
        </h2>
        <Link href="/apps/new" className="btn btn-primary">
          New application
        </Link>
      </div>

      {active.length === 0 ? (
        <p className="mt-4 text-ink-muted">
          {apps.length === 0 ? "You have no applications yet." : "You have no active applications."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {active.map((app) => (
            <li key={app.id} className="card flex flex-col">
              <h3 className="text-lg">
                <Link href={`/apps/${app.id}/edit`} className="font-medium">
                  {app.name}
                </Link>
              </h3>
              {app.description && <p className="mt-1 text-ink-muted">{app.description}</p>}
              <p className="mt-2 text-sm text-ink-muted">
                {app.published ? "Published" : "Draft"} · {responses(app._count.records)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/apps/${app.id}/edit`} className="btn btn-secondary">
                  Edit application
                </Link>
                <Link href={`/apps/${app.id}`} className="btn btn-secondary">
                  Go to application
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <details className="card mt-8">
          <summary className="cursor-pointer font-medium">Archived ({archived.length})</summary>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {archived.map((app) => (
              <li key={app.id} className="rounded-md border border-line p-4">
                <h3 className="text-base">
                  <Link href={`/apps/${app.id}/edit`} className="font-medium">
                    {app.name}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-ink-muted">Archived · {responses(app._count.records)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/apps/${app.id}/responses`} className="btn btn-secondary">
                    View responses
                  </Link>
                  <form action={restoreApplication.bind(null, app.id)}>
                    <button type="submit" className="btn btn-secondary">
                      Restore
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
