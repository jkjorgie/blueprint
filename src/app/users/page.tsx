import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { normalizeQuery } from "@/lib/record-search";
import { describeUserMatches, filterUsers } from "@/lib/user-search";
import { setEndUserActive } from "@/app/actions/users";

export const metadata: Metadata = { title: "Users" };

type Props = { searchParams: Promise<{ q?: string | string[]; created?: string }> };

const cell = "border-b border-line py-2 pr-4";

// Searchable table of the analyst's end users.
export default async function UsersPage({ searchParams }: Props) {
  const [analyst, params] = await Promise.all([requireUser(["ANALYST"]), searchParams]);
  const query = normalizeQuery(params.q);

  const users = await db.user.findMany({
    where: { role: "END_USER", managedById: analyst.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      memberships: { select: { application: { select: { name: true } } } },
    },
  });
  const shown = filterUsers(users, query);
  const noMatches = query !== "" && shown.length === 0;

  return (
    <div className="container-page py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl">Users</h1>
          <p className="mt-2 max-w-2xl text-ink-muted">
            The people who use your applications. Edit a user to choose which applications they can open and what their
            role allows.
          </p>
        </div>
        <Link href="/users/new" className="btn btn-primary">
          New user
        </Link>
      </div>

      {params.created && (
        <p role="status" className="notice notice-info mt-6">
          User created. Open Edit on their row to grant access to an application.
        </p>
      )}

      <form method="get" role="search" className="mt-8 max-w-xl">
        <label htmlFor="q" className="label">
          Search users
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input id="q" name="q" type="search" defaultValue={query} className="input min-w-0 flex-1" />
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
          {query && (
            <Link href="/users" className="text-sm font-medium underline">
              Clear
            </Link>
          )}
        </div>
      </form>

      {query && (
        <p role="status" aria-live="polite" className="mt-6 font-medium">
          {describeUserMatches(shown.length, query)}
        </p>
      )}

      {users.length === 0 ? (
        <p className="mt-6 text-ink-muted">You have not created any users yet.</p>
      ) : (
        !noMatches && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Your users</caption>
              <thead>
                <tr>
                  <th scope="col" className={`${cell} font-medium`}>
                    Name
                  </th>
                  <th scope="col" className={`${cell} font-medium`}>
                    Email
                  </th>
                  <th scope="col" className={`${cell} font-medium`}>
                    Status
                  </th>
                  <th scope="col" className={`${cell} font-medium`}>
                    Applications
                  </th>
                  <th scope="col" className={`${cell} font-medium`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((user) => (
                  <tr key={user.id}>
                    <td className={cell}>{user.name}</td>
                    <td className={cell}>{user.email}</td>
                    <td className={cell}>{user.active ? "Active" : "Inactive"}</td>
                    <td className={cell}>
                      {user.memberships.length === 0 ? (
                        <span className="text-ink-muted">None</span>
                      ) : (
                        user.memberships.map((m) => m.application.name).join(", ")
                      )}
                    </td>
                    <td className={cell}>
                      <div className="flex flex-wrap items-center gap-3">
                        <Link href={`/users/${user.id}`} className="underline" aria-label={`Edit ${user.name}`}>
                          Edit
                        </Link>
                        <form action={setEndUserActive.bind(null, user.id, !user.active)}>
                          <button
                            type="submit"
                            className="underline"
                            aria-label={`${user.active ? "Deactivate" : "Reactivate"} ${user.name}`}
                          >
                            {user.active ? "Deactivate" : "Reactivate"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
