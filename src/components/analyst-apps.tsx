// Dashboard section for business analysts: the applications they own.
import Link from "next/link";
import { db } from "@/lib/db";

export async function AnalystApps({ userId }: { userId: string }) {
  const apps = await db.application.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      published: true,
      _count: { select: { records: true } },
    },
  });

  return (
    <section aria-labelledby="my-apps-heading" className="mt-10">
      <h2 id="my-apps-heading" className="text-xl">
        My applications
      </h2>
      {apps.length === 0 ? (
        <p className="mt-4 text-ink-muted">You have no applications yet.</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {apps.map((app) => (
            <li key={app.id} className="card">
              <Link href={`/apps/${app.id}`}>{app.name}</Link>

              {app.description && (
                <p className="text-ink-muted">{app.description}</p>
              )}

              <p>
                {app.published ? "Published" : "Draft"} ·{" "}
                {app._count.records === 1
                  ? "1 record"
                  : `${app._count.records} responses`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
