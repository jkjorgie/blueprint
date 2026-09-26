// Lists the responses submitted to one application, with an optional search.
//
// Access is decided entirely by getAppForUser: it returns the app only for the
// owner or a member of a published app, and null otherwise. Turning that null
// into notFound() means a stranger cannot tell an app they may not see from one
// that does not exist.
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getAppForUser } from "@/lib/apps";
import { RecordsTable } from "@/components/records-table";
import { describeMatches, normalizeQuery, searchRecords } from "@/lib/record-search";

// In Next.js 16 route params and search params both arrive as Promises.
type Props = {
  params: Promise<{ appId: string }>;
  // A repeated key (?q=a&q=b) arrives as an array, so accept both shapes.
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function ResponsesPage({ params, searchParams }: Props) {
  const [{ appId }, { q }] = await Promise.all([params, searchParams]);
  // Trimmed, and "" when there is no search, so a query of spaces is no search.
  const query = normalizeQuery(q);

  // Order matters: establish who the user is before loading anything, so the
  // access check below has a verified identity to work with.
  const user = await requireUser();
  const app = await getAppForUser(appId, user);
  if (!app) notFound();

  // Only reached once access is settled, so this query cannot leak another
  // application's responses.
  const records = await db.dataRecord.findMany({
    where: { applicationId: app.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, data: true, createdAt: true },
  });

  const shown = query ? searchRecords(app.schema, records, query) : records;
  // With a search active and nothing matching, the status line says so and the
  // table is skipped. The table's own empty state reads "No responses yet.",
  // which would be wrong: responses exist, they just do not match.
  const noMatches = query !== "" && shown.length === 0;
  const responsesHref = `/apps/${app.id}/responses`;

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl">{app.name}: responses</h1>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link href={`/apps/${app.id}`} className="btn btn-secondary">
          Go to application
        </Link>
        {app.isOwner && (
          <Link href={`/apps/${app.id}/edit`} className="btn btn-secondary">
            Edit application
          </Link>
        )}
      </div>

      {/* A plain GET form with no action submits to this same URL with ?q= on
          it. That is what makes a search bookmarkable and lets the back button
          step through earlier searches, with no client code at all.
          role="search" gives screen reader users a landmark to jump to. */}
      <form method="get" role="search" className="mt-8 max-w-xl">
        <label htmlFor="q" className="label">
          Search responses
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {/* defaultValue, not value: the server fills it with the current
              query so it is still there after submitting, while the user stays
              free to edit it. */}
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            aria-describedby="q-hint"
            className="input min-w-0 flex-1"
          />
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
          {query && (
            <Link href={responsesHref} className="text-sm font-medium underline">
              Clear
            </Link>
          )}
        </div>
        <p id="q-hint" className="field-hint">
          Searches every text field. Not case-sensitive.
        </p>
      </form>

      {/* Rendered only while a search is active. role="status" with
          aria-live="polite" marks it as the result of the user's action, to be
          read out without interrupting whatever they are doing. */}
      {query && (
        <p role="status" aria-live="polite" className="mt-6 font-medium">
          {describeMatches(shown.length, query)}
        </p>
      )}

      {!noMatches && (
        <div className={query ? "mt-4" : "mt-8"}>
          {/* app.schema is already parsed and validated by getAppForUser, so the
              table can trust its shape without re-checking it. */}
          <RecordsTable schema={app.schema} records={shown} />
        </div>
      )}
    </div>
  );
}
