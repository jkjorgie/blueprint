// Dashboard section for end users: the published applications they can open.
import Link from "next/link";
import { db } from "@/lib/db";

export async function MemberApps({ userId }: { userId: string }) {
  // Drafts, archived applications, and roles that withhold view are filtered out.
  const memberships = await db.appMembership.findMany({
    where: {
      userId,
      application: { published: true, archivedAt: null },
      OR: [{ roleId: null }, { role: { canView: true } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      application: { select: { id: true, name: true, description: true } },
    },
  });

  const apps = memberships.map((membership) => membership.application);

  return (
    <section aria-labelledby="my-apps-heading" className="mt-10">
      <h2 id="my-apps-heading" className="text-xl">
        My applications
      </h2>
      {apps.length === 0 ? (
        <p className="mt-4 text-ink-muted">You have not been added to any applications yet.</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {apps.map((app) => (
            <li key={app.id} className="card">
              <Link href={`/apps/${app.id}`} className="font-medium">
                {app.name}
              </Link>
              {app.description && <p className="mt-2 text-ink-muted">{app.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
