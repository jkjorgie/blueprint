// Dashboard section for end users: the applications they are a member of.
//
// Rendered by src/app/dashboard/page.tsx, which calls requireUser() and passes
// the verified user's id in. That is why this component takes a userId prop and
// does not check the session itself: the caller has already proven who the user
// is, and duplicating that check here would let the two drift apart.
import Link from "next/link";
import { db } from "@/lib/db";

// An async Server Component. It runs on the server only, never in the browser,
// so it can query the database directly instead of going through an API route.
// The same import in a Client Component would fail, and would leak the
// connection string into the bundle.
export async function MemberApps({ userId }: { userId: string }) {
  const memberships = await db.appMembership.findMany({
    // Two filters, for two different reasons. `userId` scopes the list to this
    // user, so nobody sees an application they were not given access to.
    // `published: true` hides an analyst's unfinished drafts: the membership row
    // can exist before the analyst is ready to show the app, and an end user
    // must never see it in that state.
    where: { userId, application: { published: true, archivedAt: null } },
    // Newest membership first, so a freshly granted application appears at the
    // top rather than buried under older ones.
    orderBy: { createdAt: "desc" },
    // Ask only for the four columns this component renders. Fetching whole rows
    // would also pull Application.schema, a large JSON blob this list never uses.
    select: {
      application: { select: { id: true, name: true, description: true } },
    },
  });

  // findMany returns membership rows wrapped around the application, but the
  // membership itself is not rendered. Unwrapping here keeps the JSX below
  // reading as a list of applications rather than a list of join rows.
  const apps = memberships.map((membership) => membership.application);

  return (
    // aria-labelledby points at the h2 below, so assistive technology announces
    // this region as "My applications" instead of an unnamed section.
    <section aria-labelledby="my-apps-heading" className="mt-10">
      <h2 id="my-apps-heading" className="text-xl">
        My applications
      </h2>
      {apps.length === 0 ? (
        // A sentence, not an empty <ul>. An empty list is announced as "list,
        // 0 items", which tells the user nothing about what to do next.
        <p className="mt-4 text-ink-muted">You have not been added to any applications yet.</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {apps.map((app) => (
            // key lets React tell the items apart across re-renders. app.id is
            // the database primary key, so it is stable and unique; an array
            // index would not be if the list ever reordered.
            <li key={app.id} className="card">
              {/* next/link, not a plain <a>: it navigates client-side and
                  prefetches the target, so the app page opens without a full
                  page reload. The focus ring comes from the global
                  :focus-visible rule in globals.css. */}
              <Link href={`/apps/${app.id}`} className="font-medium">
                {app.name}
              </Link>
              {/* description is nullable in the Prisma schema, so guard it.
                  Rendering it unconditionally would leave an empty paragraph
                  taking up space in the card. */}
              {app.description && <p className="mt-2 text-ink-muted">{app.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
