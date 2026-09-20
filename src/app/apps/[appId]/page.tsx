import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getAppForUser } from "@/lib/apps";
import { createRecord } from "@/app/actions/records";
import { SchemaForm } from "@/components/schema-form/schema-form";

type Props = {
  params: Promise<{ appId: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { appId } = await params;
  const app = await db.application.findUnique({ where: { id: appId }, select: { name: true } });
  return { title: app?.name ?? "Application" };
}

export default async function AppPage({ params, searchParams }: Props) {
  const [{ appId }, { saved }] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const app = await getAppForUser(appId, user);
  if (!app) notFound();

  const action = createRecord.bind(null, app.id);
  const recordsHref = `/apps/${app.id}/records`;

  return (
    <div className="container-page py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl">{app.name}</h1>
          {app.description && <p className="mt-2 text-ink-muted">{app.description}</p>}
          {!app.published && (
            <p className="mt-2 text-sm font-medium text-ink-muted">
              Draft. Only you can see this application until you publish it.
            </p>
          )}
        </div>
        <Link href={recordsHref} className="btn btn-secondary">
          View responses
        </Link>
      </div>

      {saved === "1" && (
        <p role="status" className="mt-6 rounded-md bg-brand-50 p-3 text-sm text-brand-800">
          Your response was saved.{" "}
          <Link href={recordsHref} className="font-medium underline">
            View responses
          </Link>{" "}
          or submit another below.
        </p>
      )}

      <section aria-labelledby="response-form-heading" className="mt-8 max-w-2xl">
        <h2 id="response-form-heading" className="text-xl">
          Submit a response
        </h2>
        <div className="mt-4">
          <SchemaForm schema={app.schema} action={action} submitLabel="Submit" />
        </div>
      </section>
    </div>
  );
}
