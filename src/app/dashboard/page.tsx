import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { AnalystApps } from "@/components/analyst-apps";
import { MemberApps } from "@/components/member-apps";
import type { Role } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Dashboard" };

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  ANALYST: "Business analyst",
  END_USER: "End user",
};

type Props = { searchParams: Promise<{ deleted?: string; archived?: string }> };

export default async function DashboardPage({ searchParams }: Props) {
  const [user, flags] = await Promise.all([requireUser(), searchParams]);
  const status = flags.deleted ? "Application deleted." : flags.archived ? "Application archived. Find it under Archived below." : null;

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl">Welcome, {user.name}</h1>
      <p className="mt-2 text-ink-muted">
        You are signed in as <strong className="text-ink">{roleLabels[user.role]}</strong>.
      </p>
      {status && (
        <p role="status" className="notice notice-info mt-6">
          {status}
        </p>
      )}

      {user.role === "ANALYST" && <AnalystApps userId={user.id} />}
      {user.role === "END_USER" && <MemberApps userId={user.id} />}
      {user.role === "ADMIN" && (
        <section aria-labelledby="admin-heading" className="mt-10">
          <h2 id="admin-heading" className="text-xl">
            Administration
          </h2>
          <p className="mt-4 text-ink-muted">The admin console is coming soon.</p>
        </section>
      )}
    </div>
  );
}
