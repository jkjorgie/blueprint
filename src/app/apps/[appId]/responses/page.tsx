// Lists an application's responses with search (?q=) and sort (?sort=&dir=).
// Both live in the URL, so they survive bookmarks and the back button.
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getAppForUser } from "@/lib/apps";
import { RecordsTable } from "@/components/records-table";
import { describeMatches, normalizeQuery, searchRecords } from "@/lib/record-search";
import { nextSort, normalizeSort, sortHref, sortRecords } from "@/lib/record-sort";
import { AppTheme } from "@/components/app-theme";

type Props = {
  params: Promise<{ appId: string }>;
  searchParams: Promise<{ q?: string | string[]; sort?: string | string[]; dir?: string | string[] }>;
};

export default async function ResponsesPage({ params, searchParams }: Props) {
  const [{ appId }, { q, sort: rawSort, dir: rawDir }] = await Promise.all([params, searchParams]);
  const query = normalizeQuery(q);

  const user = await requireUser();
  const app = await getAppForUser(appId, user);
  if (!app) notFound();

  // Members without the all-responses scope only load what they submitted.
  const records = await db.dataRecord.findMany({
    where: { applicationId: app.id, ...(app.permissions.scope === "own" ? { createdById: user.id } : {}) },
    orderBy: { createdAt: "desc" },
    select: { id: true, data: true, createdAt: true },
  });

  const sort = normalizeSort(rawSort, rawDir, app.schema);

  const filtered = query ? searchRecords(app.schema, records, query) : records;
  const shown = sort ? sortRecords(app.schema, filtered, sort) : filtered;
  const noMatches = query !== "" && shown.length === 0;
  const responsesHref = `/apps/${app.id}/responses`;
  const hrefFor = (field: string) => sortHref(responsesHref, query, nextSort(sort, field));

  return (
    <AppTheme css={app.customCss}>
      <div className="container-page py-12">
        <h1 className="text-3xl">{app.name}: responses</h1>
        {app.permissions.scope === "own" && (
          <p className="mt-1 text-sm text-ink-muted">Showing only the responses you submitted.</p>
        )}
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

        <form method="get" role="search" className="mt-8 max-w-xl">
          <label htmlFor="q" className="label">
            Search responses
          </label>
          <div className="flex flex-wrap items-center gap-3">
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

        {query && (
          <p role="status" aria-live="polite" className="mt-6 font-medium">
            {describeMatches(shown.length, query)}
          </p>
        )}

        {!noMatches && (
          <div className={query ? "mt-4" : "mt-8"}>
            <RecordsTable
              schema={app.schema}
              records={shown}
              appId={app.archived || !(app.permissions.edit || app.permissions.delete) ? undefined : app.id}
              canEdit={app.permissions.edit}
              canDelete={app.permissions.delete}
              sort={{ active: sort, hrefFor }}
            />
          </div>
        )}
      </div>
    </AppTheme>
  );
}
