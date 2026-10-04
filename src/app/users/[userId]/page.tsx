import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { setEndUserActive } from "@/app/actions/users";
import { AccessForm, type AccessApp } from "../access-form";

export const metadata: Metadata = { title: "Edit user" };

type Props = { params: Promise<{ userId: string }> };

// One end user: activation, and which applications and roles they have.
export default async function EditUserPage({ params }: Props) {
  const [{ userId }, analyst] = await Promise.all([params, requireUser(["ANALYST"])]);

  const [user, apps] = await Promise.all([
    db.user.findFirst({
      where: { id: userId, role: "END_USER", managedById: analyst.id },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        memberships: { select: { applicationId: true, roleId: true } },
      },
    }),
    db.application.findMany({
      where: { ownerId: analyst.id, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, roles: { orderBy: { name: "asc" }, select: { id: true, name: true } } },
    }),
  ]);
  if (!user) notFound();

  const accessApps: AccessApp[] = apps.map((app) => ({
    id: app.id,
    name: app.name,
    roles: app.roles,
    membership: user.memberships.find((m) => m.applicationId === app.id) ?? null,
  }));

  return (
    <div className="container-page py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl">{user.name}</h1>
          <p className="mt-1 text-ink-muted">
            {user.email} · {user.active ? "Active" : "Inactive"}
          </p>
          <p className="mt-3">
            <Link href="/users" className="btn btn-secondary">
              Back to users
            </Link>
          </p>
        </div>
        <form action={setEndUserActive.bind(null, user.id, !user.active)}>
          <button type="submit" className="btn btn-secondary">
            {user.active ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </div>

      <section aria-labelledby="access-heading" className="mt-10 max-w-2xl">
        <h2 id="access-heading" className="text-xl">
          Application access
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink-muted">
          A member with no role can submit responses and see only their own; a role can widen that.
        </p>
        <div className="card">
          <AccessForm userId={user.id} userName={user.name} apps={accessApps} />
        </div>
      </section>
    </div>
  );
}
